import { getGetTaskQueryKey, startTask } from '@/api/generated/endpoints/app-task'
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

interface TaskStreamState {
  taskId?: string
  status?: string
  currentStep?: string
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
  const [taskState, setTaskState] = useState<TaskStreamState>({
    taskId,
    status: initialTaskStatus,
  })
  const [streamMessages, setStreamMessages] = useState<StreamMessage[]>([])
  const [runtimeDetails, setRuntimeDetails] = useState<RuntimeDetailEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const startedTaskIdsRef = useRef(new Set<string>())
  const messageKeysRef = useRef(new Set<string>())
  const activeTaskIdRef = useRef(taskId)

  activeTaskIdRef.current = taskId

  useEffect(() => {
    setTaskState((prev) => {
      if (prev.taskId === taskId) {
        return {
          ...prev,
          status: initialTaskStatus ?? prev.status,
        }
      }

      return {
        taskId,
        status: initialTaskStatus,
      }
    })
  }, [initialTaskStatus, taskId])

  useEffect(() => {
    setStreamMessages([])
    setRuntimeDetails([])
    setIsConnected(false)
    messageKeysRef.current.clear()
  }, [taskId])

  const status = taskState.taskId === taskId ? taskState.status : initialTaskStatus
  const currentStep = taskState.taskId === taskId ? taskState.currentStep : undefined

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
      void queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) })
    }

    const mergeTaskState = (nextState: Omit<TaskStreamState, 'taskId'>) => {
      if (controller.signal.aborted || activeTaskIdRef.current !== taskId) {
        return
      }

      setTaskState((prev) => ({
        taskId,
        status: nextState.status ?? (prev.taskId === taskId ? prev.status : initialTaskStatus),
        currentStep:
          nextState.currentStep ?? (prev.taskId === taskId ? prev.currentStep : undefined),
      }))
    }

    const startPendingTask = async () => {
      if (controller.signal.aborted || activeTaskIdRef.current !== taskId) {
        return
      }

      if (startedTaskIdsRef.current.has(taskId)) {
        return
      }

      startedTaskIdsRef.current.add(taskId)

      try {
        const response = await startTask(taskId, undefined, controller.signal)
        const nextStatus = response.data?.status
        const nextStep = response.data?.currentStep

        mergeTaskState({
          status: nextStatus,
          currentStep: nextStep,
        })
      } catch (error) {
        startedTaskIdsRef.current.delete(taskId)

        if (!controller.signal.aborted && activeTaskIdRef.current === taskId) {
          onError?.((error as { message?: string })?.message ?? '任务启动失败')
        }
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

        if (controller.signal.aborted || activeTaskIdRef.current !== taskId) {
          return
        }

        setIsConnected(true)

        if (initialTaskStatus === 'PENDING') {
          await startPendingTask()
        }
      },
      onmessage(message) {
        if (controller.signal.aborted || activeTaskIdRef.current !== taskId) {
          return
        }

        const payload = getEventPayload(message.data)

        if (!payload) {
          return
        }

        if (payload.taskId && payload.taskId !== taskId) {
          return
        }

        const eventType = message.event || payload.eventType
        const event = {
          ...payload,
          taskId: payload.taskId ?? taskId,
          eventType,
        }

        mergeTaskState({
          status: event.status,
          currentStep: event.currentStep,
        })

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
        if (activeTaskIdRef.current === taskId) {
          setIsStreaming(false)
          setIsConnected(false)
        }
      },
      onerror(error) {
        if (!isClosed && !controller.signal.aborted && activeTaskIdRef.current === taskId) {
          onError?.((error as { message?: string })?.message ?? '任务流连接异常')
        }

        if (activeTaskIdRef.current === taskId) {
          setIsStreaming(false)
        }

        throw error
      },
    }).catch((error) => {
      if (!controller.signal.aborted && activeTaskIdRef.current === taskId) {
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
