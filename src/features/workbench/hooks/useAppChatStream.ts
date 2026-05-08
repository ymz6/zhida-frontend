import type { ChatRequest, ChatRequestMode } from '@/api/generated/models'
import { queryClient } from '@/libs/query-client'
import { router } from '@/libs/router'
import { useAuthSessionStore } from '@/stores/auth-session'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { RuntimeDetailEvent, TaskStreamEvent } from '../types'
import { isTerminalTaskStatus } from '../types'

interface UseAppChatStreamOptions {
  appId: string
  onError?: (message: string) => void
  onSettled?: (result: { mode: ChatRequestMode; status?: string }) => void
}

interface StartAppChatStreamParams {
  mode: ChatRequestMode
  prompt?: string
  onOpen?: () => void
}

interface StreamMessage {
  key: string
  messageId?: string
  taskId?: string
  appId?: string
  role?: string
  messageType?: string
  content: string
  metadata?: string
  createdAt?: string
  streaming?: boolean
}

interface AppChatStreamState {
  runId?: string
  status?: string
  currentStep?: string
}

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { message?: string })?.message ?? fallback
}

function parseStreamEvent(rawData: string): TaskStreamEvent | null {
  if (!rawData) {
    return null
  }

  try {
    return JSON.parse(rawData) as TaskStreamEvent
  } catch {
    return null
  }
}

function getLocalUserMessageKey(runId: string) {
  return `local-user-${runId}`
}

function getAssistantDraftKey(runId: string) {
  return `assistant-draft-${runId}`
}

function getStreamMessageKey(event: TaskStreamEvent, runId: string) {
  if (event.messageId) {
    return `message-${event.messageId}`
  }

  return `stream-${runId}-${event.createdAt ?? Date.now()}-${Math.random()}`
}

function buildChatRequest({ mode, prompt }: StartAppChatStreamParams): ChatRequest {
  if (mode === 'RESUME') {
    return { mode }
  }

  return {
    mode,
    prompt: prompt ?? '',
  }
}

function isRuntimeDetailEvent(eventType: string) {
  return eventType === 'command-log' || eventType.startsWith('agent.')
}

function handleAuthExpired() {
  useAuthSessionStore.getState().clearSession()
  queryClient.clear()

  if (router.state.location.pathname !== '/auth/login') {
    void router.navigate({
      to: '/auth/login',
      replace: true,
    })
  }
}

async function getOpenErrorMessage(response: Response) {
  const fallback = `SSE 连接失败：${response.status}`

  try {
    const responseData = (await response.clone().json()) as { code?: number; message?: string }

    if (responseData.code === 40100) {
      handleAuthExpired()
    }

    return responseData.message || fallback
  } catch {
    return fallback
  }
}

export function useAppChatStream({ appId, onError, onSettled }: UseAppChatStreamOptions) {
  const accessToken = useAuthSessionStore((state) => state.accessToken)
  const [streamState, setStreamState] = useState<AppChatStreamState>({})
  const [streamMessages, setStreamMessages] = useState<StreamMessage[]>([])
  const [runtimeDetails, setRuntimeDetails] = useState<RuntimeDetailEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const activeControllerRef = useRef<AbortController | null>(null)
  const activeRequestIdRef = useRef(0)
  const isStreamingRef = useRef(false)
  const runtimeDetailKeysRef = useRef(new Set<string>())

  const mergeStreamState = useCallback(
    (requestId: number, nextState: Omit<AppChatStreamState, 'runId'>) => {
      if (activeRequestIdRef.current !== requestId) {
        return
      }

      setStreamState((prev) => ({
        ...prev,
        status: nextState.status ?? prev.status,
        currentStep: nextState.currentStep ?? prev.currentStep,
      }))
    },
    [],
  )

  const startStream = useCallback(
    ({ mode, prompt, onOpen }: StartAppChatStreamParams) => {
      if (isStreamingRef.current) {
        return false
      }

      const requestId = activeRequestIdRef.current + 1
      const runId = `app-chat-${appId}-${requestId}`
      const controller = new AbortController()
      const requestBody = buildChatRequest({ mode, prompt })
      let didSettle = false
      let didReportError = false
      let latestStatus: string | undefined = 'PENDING'

      activeRequestIdRef.current = requestId
      activeControllerRef.current = controller
      isStreamingRef.current = true
      runtimeDetailKeysRef.current.clear()
      setStreamState({ runId, status: 'PENDING' })
      if (mode !== 'RESUME' && prompt) {
        setStreamMessages((prev) => [
          ...prev,
          {
            key: getLocalUserMessageKey(runId),
            appId,
            taskId: runId,
            role: 'USER',
            messageType: 'CHAT',
            content: prompt,
            createdAt: new Date().toISOString(),
          },
        ])
      }
      setRuntimeDetails([])
      setIsConnected(false)
      setIsStreaming(true)

      const reportError = (error: unknown) => {
        if (
          didReportError ||
          controller.signal.aborted ||
          activeRequestIdRef.current !== requestId
        ) {
          return
        }

        didReportError = true
        onError?.(getErrorMessage(error, '任务流连接异常'))
      }

      const finishStream = (status?: string) => {
        if (didSettle || activeRequestIdRef.current !== requestId) {
          return
        }

        didSettle = true
        isStreamingRef.current = false
        setIsStreaming(false)
        setIsConnected(false)
        // 连接异常或终态到达时，确保 Markdown 尾标能收敛到完成态。
        setStreamMessages((prev) =>
          prev.map((item) => (item.streaming ? { ...item, streaming: false } : item)),
        )
        onSettled?.({ mode, status })
      }

      const upsertStreamMessage = (event: TaskStreamEvent, eventType: string) => {
        const shouldReuseDraft =
          event.role === 'ASSISTANT' && eventType === 'assistant.completed' && !event.messageId
        const key = shouldReuseDraft
          ? getAssistantDraftKey(runId)
          : getStreamMessageKey(event, runId)
        const nextMessage: StreamMessage = {
          key,
          messageId: event.messageId,
          appId: event.appId ?? appId,
          taskId: event.taskId ?? runId,
          role: event.role,
          messageType: event.messageType ?? 'CHAT',
          content: event.content ?? '',
          metadata: event.metadata,
          createdAt: event.createdAt,
          streaming: false,
        }

        setStreamMessages((prev) => {
          const filteredMessages = prev.filter((item) => {
            if (event.role === 'USER' && item.key === getLocalUserMessageKey(runId)) {
              return false
            }

            if (
              event.role === 'ASSISTANT' &&
              eventType === 'assistant.completed' &&
              event.messageId
            ) {
              return item.key !== getAssistantDraftKey(runId)
            }

            return true
          })
          const existingIndex = filteredMessages.findIndex(
            (item) =>
              item.key === key || Boolean(event.messageId && item.messageId === event.messageId),
          )

          if (existingIndex < 0) {
            return [...filteredMessages, nextMessage]
          }

          const nextMessages = [...filteredMessages]

          nextMessages[existingIndex] = {
            ...nextMessages[existingIndex],
            ...nextMessage,
          }

          return nextMessages
        })
      }

      const appendAssistantDelta = (event: TaskStreamEvent) => {
        const key = getAssistantDraftKey(runId)

        setStreamMessages((prev) => {
          const existingIndex = prev.findIndex((item) => item.key === key)
          const nextContent = event.content ?? ''

          if (existingIndex < 0) {
            return [
              ...prev,
              {
                key,
                appId: event.appId ?? appId,
                taskId: event.taskId ?? runId,
                role: 'ASSISTANT',
                messageType: 'CHAT',
                content: nextContent,
                createdAt: event.createdAt,
                streaming: true,
              },
            ]
          }

          const nextMessages = [...prev]
          const existingMessage = nextMessages[existingIndex]

          nextMessages[existingIndex] = {
            ...existingMessage,
            content: `${existingMessage.content}${nextContent}`,
            createdAt: event.createdAt ?? existingMessage.createdAt,
            streaming: true,
          }

          return nextMessages
        })
      }

      const appendRuntimeDetail = (event: TaskStreamEvent) => {
        const detailKey = event.taskEventId ? `task-event-${event.taskEventId}` : undefined

        if (detailKey && runtimeDetailKeysRef.current.has(detailKey)) {
          return
        }

        if (detailKey) {
          runtimeDetailKeysRef.current.add(detailKey)
        }

        setRuntimeDetails((prev) => [
          ...prev,
          {
            ...event,
            id: detailKey ?? `detail-${runId}-${Date.now()}-${Math.random()}`,
            taskId: event.taskId ?? runId,
            receivedAt: Date.now(),
          },
        ])
      }

      const runStream = async () => {
        try {
          await fetchEventSource(`/api/apps/${appId}/chat`, {
            method: 'POST',
            signal: controller.signal,
            openWhenHidden: true,
            headers: {
              Accept: 'text/event-stream',
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(requestBody),
            async onopen(response) {
              const contentType = response.headers.get('content-type') ?? ''

              if (!response.ok || !contentType.includes('text/event-stream')) {
                throw new Error(await getOpenErrorMessage(response))
              }

              if (controller.signal.aborted || activeRequestIdRef.current !== requestId) {
                return
              }

              setIsConnected(true)
              onOpen?.()
            },
            onmessage(message) {
              if (controller.signal.aborted || activeRequestIdRef.current !== requestId) {
                return
              }

              const payload = parseStreamEvent(message.data)

              if (!payload) {
                return
              }

              const eventType = message.event || payload.eventType
              const event: TaskStreamEvent = {
                ...payload,
                appId: payload.appId ?? appId,
                taskId: payload.taskId ?? runId,
                eventType,
              }

              mergeStreamState(requestId, {
                status: event.status,
                currentStep: event.currentStep,
              })
              latestStatus = event.status ?? latestStatus

              if (eventType === 'assistant.delta') {
                appendAssistantDelta(event)
              } else if (eventType === 'assistant.completed' || eventType === 'message') {
                upsertStreamMessage(event, eventType)
              } else if (isRuntimeDetailEvent(eventType)) {
                appendRuntimeDetail(event)
              }

              if (isTerminalTaskStatus(event.status)) {
                finishStream(event.status)
                controller.abort()
              }
            },
            onclose() {
              finishStream(latestStatus)
            },
            onerror(error) {
              reportError(error)
              finishStream('FAILED')
              throw error
            },
          })
        } catch (error) {
          if (!controller.signal.aborted) {
            reportError(error)
            finishStream('FAILED')
          }
        }
      }

      void runStream()

      return true
    },
    [accessToken, appId, mergeStreamState, onError, onSettled],
  )

  useEffect(() => {
    setStreamState({})
    setStreamMessages([])
    setRuntimeDetails([])
    setIsConnected(false)
    setIsStreaming(false)
    runtimeDetailKeysRef.current.clear()

    return () => {
      activeControllerRef.current?.abort()
      isStreamingRef.current = false
    }
  }, [appId])

  return useMemo(
    () => ({
      currentRunId: streamState.runId,
      status: streamState.status,
      currentStep: streamState.currentStep,
      streamMessages,
      runtimeDetails,
      isConnected,
      isStreaming,
      startStream,
    }),
    [
      isConnected,
      isStreaming,
      runtimeDetails,
      startStream,
      streamMessages,
      streamState.currentStep,
      streamState.runId,
      streamState.status,
    ],
  )
}
