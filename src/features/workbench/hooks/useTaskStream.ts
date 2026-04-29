import { startTask } from '@/api/generated/endpoints/app-task'
import {
  getGetAppQueryKey,
  getListAppMessagesQueryKey,
  getListAppTasksQueryKey,
} from '@/api/generated/endpoints/app'
import { queryClient } from '@/libs/query-client'
import { useAuthSessionStore } from '@/stores/auth-session'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { RuntimeDetailEvent, TaskStreamEvent } from '../types'
import { isTerminalTaskStatus } from '../types'

interface UseTaskStreamOptions {
  appId: string
  taskId?: string
  initialTaskStatus?: string
  enabled?: boolean
  onError?: (message: string) => void
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
}

function getEventPayload(rawData: string): TaskStreamEvent | null {
  if (!rawData) {
    return null
  }

  try {
    return JSON.parse(rawData) as TaskStreamEvent
  } catch {
    return null
  }
}

function getStreamMessageKey(event: TaskStreamEvent) {
  if (event.messageId) {
    return `message-${event.messageId}`
  }

  return `stream-${event.taskId ?? 'task'}-${event.createdAt ?? Date.now()}-${Math.random()}`
}

function toRuntimeDetailEvent(event: TaskStreamEvent): RuntimeDetailEvent {
  return {
    ...event,
    id: `detail-${event.taskId ?? 'task'}-${Date.now()}-${Math.random()}`,
    receivedAt: Date.now(),
  }
}

export function useTaskStream({
  appId,
  taskId,
  initialTaskStatus,
  enabled = true,
  onError,
}: UseTaskStreamOptions) {
  const accessToken = useAuthSessionStore((state) => state.accessToken)
  const [status, setStatus] = useState<string | undefined>(initialTaskStatus)
  const [currentStep, setCurrentStep] = useState<string | undefined>()
  const [streamMessages, setStreamMessages] = useState<StreamMessage[]>([])
  const [runtimeDetails, setRuntimeDetails] = useState<RuntimeDetailEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const startedTaskIdsRef = useRef(new Set<string>())
  const messageKeysRef = useRef(new Set<string>())

  useEffect(() => {
    setStatus(initialTaskStatus)
  }, [initialTaskStatus, taskId])

  useEffect(() => {
    setStreamMessages([])
    setRuntimeDetails([])
    setCurrentStep(undefined)
    setIsConnected(false)
    messageKeysRef.current.clear()
  }, [taskId])

  useEffect(() => {
    if (!enabled || !taskId || isTerminalTaskStatus(initialTaskStatus)) {
      setIsStreaming(false)
      return
    }

    const controller = new AbortController()
    let isClosed = false

    const invalidateTaskData = () => {
      void queryClient.invalidateQueries({ queryKey: getGetAppQueryKey(appId) })
      void queryClient.invalidateQueries({ queryKey: getListAppMessagesQueryKey(appId) })
      void queryClient.invalidateQueries({ queryKey: getListAppTasksQueryKey(appId) })
    }

    const startPendingTask = async () => {
      if (startedTaskIdsRef.current.has(taskId)) {
        return
      }

      startedTaskIdsRef.current.add(taskId)

      try {
        const response = await startTask(taskId)
        const nextStatus = response.data?.status
        const nextStep = response.data?.currentStep

        if (nextStatus) {
          setStatus(nextStatus)
        }

        if (nextStep) {
          setCurrentStep(nextStep)
        }
      } catch (error) {
        startedTaskIdsRef.current.delete(taskId)
        onError?.((error as { message?: string })?.message ?? '任务启动失败')
      }
    }

    setIsStreaming(true)

    void fetchEventSource(`/api/tasks/${taskId}/stream`, {
      signal: controller.signal,
      openWhenHidden: true,
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
      async onopen(response) {
        if (!response.ok) {
          throw new Error(`SSE 连接失败：${response.status}`)
        }

        setIsConnected(true)

        if (initialTaskStatus === 'PENDING') {
          await startPendingTask()
        }
      },
      onmessage(message) {
        const payload = getEventPayload(message.data)

        if (!payload) {
          return
        }

        const eventType = message.event || payload.eventType
        const event = {
          ...payload,
          eventType,
        }

        if (event.status) {
          setStatus(event.status)
        }

        if (event.currentStep) {
          setCurrentStep(event.currentStep)
        }

        if (eventType === 'message') {
          const key = getStreamMessageKey(event)

          if (!messageKeysRef.current.has(key)) {
            messageKeysRef.current.add(key)
            setStreamMessages((prev) => [
              ...prev,
              {
                key,
                messageId: event.messageId,
                appId: event.appId,
                taskId: event.taskId,
                role: event.role,
                messageType: event.messageType,
                content: event.content ?? '',
                metadata: event.metadata,
                createdAt: event.createdAt,
              },
            ])
          }
        }

        if (eventType === 'command-log' || eventType === 'agent-trace') {
          setRuntimeDetails((prev) => [...prev, toRuntimeDetailEvent(event)])
        }

        if (
          event.status === 'SUCCESS' ||
          event.status === 'FAILED' ||
          event.status === 'CANCELED'
        ) {
          invalidateTaskData()
          setIsStreaming(false)
          controller.abort()
        }
      },
      onclose() {
        setIsStreaming(false)
        setIsConnected(false)
      },
      onerror(error) {
        if (!isClosed) {
          onError?.((error as { message?: string })?.message ?? '任务流连接异常')
        }

        setIsStreaming(false)
        throw error
      },
    }).catch((error) => {
      if (!controller.signal.aborted) {
        onError?.((error as { message?: string })?.message ?? '任务流连接异常')
      }
    })

    return () => {
      isClosed = true
      controller.abort()
      setIsStreaming(false)
    }
  }, [accessToken, appId, enabled, initialTaskStatus, onError, taskId])

  return useMemo(
    () => ({
      status,
      currentStep,
      streamMessages,
      runtimeDetails,
      isConnected,
      isStreaming,
    }),
    [currentStep, isConnected, isStreaming, runtimeDetails, status, streamMessages],
  )
}
