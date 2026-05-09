import type { ChatRequest, ChatRequestMode } from '@/api/generated/models'
import { queryClient } from '@/libs/query-client'
import { router } from '@/libs/router'
import { useAuthSessionStore } from '@/stores/auth-session'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { RuntimeDetailEvent, TaskStreamEvent } from '../types'
import { isTerminalTaskStatus } from '../types'
import type { ChatContentBlock, ConversationActivityStatus } from '../utils/conversationTimeline'

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
  contentType?: string
  content: string
  blocks?: ChatContentBlock[]
  metadata?: string
  createdAt?: string
  streaming?: boolean
  pending?: boolean
}

type InlineToolUseBlock = Extract<ChatContentBlock, { type: 'tool_use' }>

interface InlineToolKeyState {
  count: number
  latestKey: string
  pending: boolean
  eventId?: string
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
  return eventType === 'state' || eventType === 'command-log' || eventType.startsWith('agent.')
}

function normalizeText(content: string | undefined) {
  return (content ?? '')
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/\r\n?/g, '\n')
}

function parseMetadata(metadata: string | undefined) {
  if (!metadata) {
    return null
  }

  try {
    const parsed = JSON.parse(metadata)

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function getMetadataString(metadata: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key]

    if (Array.isArray(value) && value.length > 0) {
      return value.map(String).join(' ')
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
  }

  return ''
}

function getMetadataBoolean(metadata: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key]

    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') {
        return true
      }

      if (value.toLowerCase() === 'false') {
        return false
      }
    }
  }

  return undefined
}

function getJsonObjectFromText(content: string | undefined) {
  const jsonText = content?.match(/\{[\s\S]*\}/)?.[0]

  if (!jsonText) {
    return null
  }

  try {
    const parsed = JSON.parse(jsonText)

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function getPreview(content: string | undefined, length = 120) {
  const firstLine = normalizeText(content)
    .split('\n')
    .find((line) => line.trim())
    ?.trim()

  return firstLine ? firstLine.slice(0, length) : ''
}

function getCommandFromContent(content: string | undefined) {
  const firstLine = normalizeText(content)
    .split('\n')
    .find((line) => line.trim())

  if (!firstLine) {
    return ''
  }

  const trimmedLine = firstLine.trim()

  return trimmedLine.startsWith('$ ') ? trimmedLine.slice(2).trim() : ''
}

function getCommandFromEvent(event: TaskStreamEvent) {
  const metadata = parseMetadata(event.metadata)
  const metadataCommand = getMetadataString(metadata, ['command', 'cmd'])

  return metadataCommand || getCommandFromContent(event.content)
}

function getPathFromText(text: string | undefined) {
  const pathMatch = normalizeText(text).match(/(?:[\w.-]+[\\/])+[\w.-]+\.[A-Za-z0-9]+/)

  return pathMatch?.[0] ?? ''
}

function getPathFromEvent(event: TaskStreamEvent) {
  const metadata = parseMetadata(event.metadata)
  const parsedContent = getJsonObjectFromText(event.content)

  return (
    getMetadataString(metadata, ['path', 'filePath', 'filename', 'file']) ||
    getMetadataString(parsedContent, ['path', 'filePath', 'filename', 'file']) ||
    getPathFromText(event.content)
  )
}

function getRuntimeStatus(
  eventType: string,
  metadata: string | undefined,
): ConversationActivityStatus {
  const parsedMetadata = parseMetadata(metadata)
  const success = getMetadataBoolean(parsedMetadata, ['success'])
  const hasFailed = getMetadataBoolean(parsedMetadata, ['hasFailed', 'isError'])
  const exitCode = Number(getMetadataString(parsedMetadata, ['exitCode']))

  if (eventType.endsWith('.started') || eventType.endsWith('.called')) {
    return 'running'
  }

  if (eventType.endsWith('.failed') || success === false || hasFailed === true) {
    return 'error'
  }

  if (!Number.isNaN(exitCode) && exitCode !== 0) {
    return 'error'
  }

  if (eventType.endsWith('.succeeded') || success === true || hasFailed === false) {
    return 'success'
  }

  return 'info'
}

function appendTextDelta(blocks: ChatContentBlock[] | undefined, delta: string) {
  const nextBlocks = blocks?.length ? [...blocks] : []
  const lastBlock = nextBlocks.at(-1)

  if (lastBlock?.type === 'text') {
    nextBlocks[nextBlocks.length - 1] = {
      ...lastBlock,
      text: `${lastBlock.text}${delta}`,
    }
  } else {
    nextBlocks.push({ type: 'text', text: delta })
  }

  return nextBlocks
}

function getBlocksText(blocks: ChatContentBlock[] | undefined) {
  return blocks
    ?.filter((block): block is Extract<ChatContentBlock, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

function getRuntimeResult(event: TaskStreamEvent, status: ConversationActivityStatus) {
  const content = normalizeText(event.content).trim()

  if (content) {
    return content
  }

  if (status === 'running') {
    return null
  }

  return status === 'error' ? '执行失败或无结果' : '执行完成'
}

function upsertBlock(blocks: ChatContentBlock[] | undefined, nextBlock: InlineToolUseBlock) {
  const nextBlocks = blocks?.length ? [...blocks] : []
  const existingIndex = nextBlocks.findIndex(
    (block) => block.type === 'tool_use' && block.key === nextBlock.key,
  )

  if (existingIndex < 0) {
    return [...nextBlocks, nextBlock]
  }

  const existingBlock = nextBlocks[existingIndex] as InlineToolUseBlock
  const mergedLogs = (() => {
    if (!nextBlock.logs?.length) {
      return existingBlock.logs
    }

    if (!existingBlock.logs?.length) {
      return nextBlock.logs
    }

    return [
      ...existingBlock.logs,
      ...nextBlock.logs.filter((log) => log !== existingBlock.logs?.at(-1)),
    ]
  })()

  nextBlocks[existingIndex] = {
    ...existingBlock,
    ...nextBlock,
    input: nextBlock.input ?? existingBlock.input,
    logs: mergedLogs,
    path: nextBlock.path || existingBlock.path,
    result: nextBlock.result ?? existingBlock.result,
    summary: nextBlock.summary || existingBlock.summary,
  }

  return nextBlocks
}

function appendBlockLog(blocks: ChatContentBlock[] | undefined, key: string, logText: string) {
  const nextBlocks = blocks?.length ? [...blocks] : []
  const existingIndex = nextBlocks.findIndex(
    (block) => block.type === 'tool_use' && block.key === key,
  )

  if (existingIndex < 0) {
    return nextBlocks
  }

  const existingBlock = nextBlocks[existingIndex] as InlineToolUseBlock
  const logs = existingBlock.logs ?? []

  if (!logText || logs.at(-1) === logText) {
    return nextBlocks
  }

  nextBlocks[existingIndex] = {
    ...existingBlock,
    logs: [...logs, logText],
    summary: getPreview(logText) || existingBlock.summary,
  }

  return nextBlocks
}

function buildCommandBlock(event: TaskStreamEvent, eventType: string, key: string) {
  const command = getCommandFromEvent(event) || '命令执行'
  const status = getRuntimeStatus(eventType, event.metadata)
  const result = getRuntimeResult(event, status)

  return {
    type: 'tool_use',
    key,
    name: command,
    input: { command },
    result,
    status,
    source: 'command',
    summary: getPreview(result ?? undefined) || (status === 'running' ? '等待命令输出' : ''),
    logs: result ? [result] : undefined,
    label: '命令',
    eventType,
  } satisfies InlineToolUseBlock
}

function buildValidationBlock(event: TaskStreamEvent, eventType: string, key: string) {
  const status = getRuntimeStatus(eventType, event.metadata)
  const result = getRuntimeResult(event, status)

  return {
    type: 'tool_use',
    key,
    name: '项目校验',
    input: parseMetadata(event.metadata) ?? {},
    result,
    status,
    source: 'validation',
    summary: getPreview(result ?? undefined) || (status === 'running' ? '正在校验项目' : ''),
    logs: result ? [result] : undefined,
    label: '校验',
    eventType,
  } satisfies InlineToolUseBlock
}

function buildToolBlock(event: TaskStreamEvent, eventType: string, key: string) {
  const metadata = parseMetadata(event.metadata)
  const parsedContent = getJsonObjectFromText(event.content)
  const toolName = getMetadataString(metadata, ['toolName', 'tool', 'name']) || '工具调用'
  const path = getPathFromEvent(event)
  const status = getRuntimeStatus(eventType, event.metadata)
  const result = eventType.endsWith('.called') ? null : getRuntimeResult(event, status)

  return {
    type: 'tool_use',
    key,
    name: toolName,
    input: parsedContent ?? metadata ?? (path ? { path } : {}),
    result,
    status,
    path,
    source: 'tool',
    summary:
      getPreview(result ?? undefined) || path || (status === 'running' ? '等待工具结果' : ''),
    label: '工具调用',
    eventType,
  } satisfies InlineToolUseBlock
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
  const inlineCommandKeysRef = useRef(new Map<string, string>())
  const inlineToolKeysRef = useRef(new Map<string, InlineToolKeyState>())

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
      let assistantFinalized = false
      let shouldRemoveAssistantDraftOnFinish = false
      let latestStatus: string | undefined = 'PENDING'

      activeRequestIdRef.current = requestId
      activeControllerRef.current = controller
      isStreamingRef.current = true
      runtimeDetailKeysRef.current.clear()
      inlineCommandKeysRef.current.clear()
      inlineToolKeysRef.current.clear()
      setStreamState({ runId, status: 'PENDING' })
      if (mode !== 'RESUME' && prompt) {
        const createdAt = new Date().toISOString()

        setStreamMessages((prev) => [
          ...prev,
          {
            key: getLocalUserMessageKey(runId),
            appId,
            taskId: runId,
            role: 'USER',
            contentType: 'TEXT',
            content: prompt,
            createdAt,
            pending: true,
          },
          {
            key: getAssistantDraftKey(runId),
            appId,
            taskId: runId,
            role: 'ASSISTANT',
            contentType: 'TEXT',
            content: '',
            createdAt,
            streaming: true,
            // 本地 assistant 草稿只负责即时反馈，首个真实事件到来后会变成正式内容态。
            pending: true,
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

      const isAssistantFinalEvent = (event: TaskStreamEvent, eventType: string) =>
        eventType === 'assistant.completed' ||
        (eventType === 'message' && event.role === 'ASSISTANT')

      const finishStream = (status?: string) => {
        if (didSettle || activeRequestIdRef.current !== requestId) {
          return
        }

        didSettle = true
        isStreamingRef.current = false
        setIsStreaming(false)
        setIsConnected(false)
        setStreamMessages((prev) => {
          // 带 messageId 的正式消息会独立入列，草稿只作为过渡态清理掉。
          const nextMessages = shouldRemoveAssistantDraftOnFinish
            ? prev.filter((item) => item.key !== getAssistantDraftKey(runId))
            : prev

          // 连接异常或终态到达时，确保 Markdown 尾标能收敛到完成态。
          return nextMessages.map((item) =>
            item.streaming || item.pending ? { ...item, streaming: false, pending: false } : item,
          )
        })
        onSettled?.({ mode, status })
      }

      const upsertStreamMessage = (event: TaskStreamEvent, eventType: string) => {
        const isAssistantFinalMessage = isAssistantFinalEvent(event, eventType)
        const shouldReuseDraft = isAssistantFinalMessage && !event.messageId
        const key = shouldReuseDraft
          ? getAssistantDraftKey(runId)
          : getStreamMessageKey(event, runId)
        const nextMessage: StreamMessage = {
          key,
          messageId: event.messageId,
          appId: event.appId ?? appId,
          taskId: event.taskId ?? runId,
          role: event.role,
          contentType: event.contentType ?? (event.role === 'ASSISTANT' ? 'BLOCKS' : 'TEXT'),
          content: event.content ?? '',
          blocks: undefined,
          metadata: event.metadata,
          createdAt: event.createdAt,
          streaming: false,
          pending: false,
        }

        setStreamMessages((prev) => {
          const filteredMessages = prev.filter((item) => {
            if (event.role === 'USER' && item.key === getLocalUserMessageKey(runId)) {
              return false
            }

            if (isAssistantFinalMessage && event.messageId) {
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
            const blocks = appendTextDelta(undefined, nextContent)

            return [
              ...prev,
              {
                key,
                appId: event.appId ?? appId,
                taskId: event.taskId ?? runId,
                role: 'ASSISTANT',
                contentType: 'TEXT',
                content: nextContent,
                blocks,
                createdAt: event.createdAt,
                streaming: true,
              },
            ]
          }

          const nextMessages = [...prev]
          const existingMessage = nextMessages[existingIndex]

          nextMessages[existingIndex] = {
            ...existingMessage,
            blocks: appendTextDelta(existingMessage.blocks, nextContent),
            content: `${existingMessage.content}${nextContent}`,
            createdAt: event.createdAt ?? existingMessage.createdAt,
            streaming: true,
            pending: false,
          }

          return nextMessages
        })
      }

      const getInlineCommandKey = (event: TaskStreamEvent) => {
        const command = getCommandFromEvent(event) || '命令执行'
        const pendingKey = `${event.taskId ?? runId}-${command}`
        const existingKey = inlineCommandKeysRef.current.get(pendingKey)
        const nextKey =
          existingKey ||
          (event.taskEventId
            ? `inline-command-${event.taskEventId}`
            : `inline-command-${pendingKey}`)

        inlineCommandKeysRef.current.set(pendingKey, nextKey)

        return nextKey
      }

      const getInlineToolKey = (event: TaskStreamEvent, eventType: string) => {
        const metadata = parseMetadata(event.metadata)
        const toolName = getMetadataString(metadata, ['toolName', 'tool', 'name']) || '工具调用'
        const pendingKey = `${event.taskId ?? runId}-${toolName}`
        const existingState = inlineToolKeysRef.current.get(pendingKey)

        if (eventType.endsWith('.called')) {
          const count = (existingState?.count ?? 0) + 1
          const nextKey = event.taskEventId
            ? `inline-tool-${event.taskEventId}`
            : `inline-tool-${pendingKey}-${count}`

          // 同名工具可能连续调用多次，不能只按 toolName 复用同一张卡片。
          inlineToolKeysRef.current.set(pendingKey, {
            count,
            latestKey: nextKey,
            pending: true,
            eventId: event.taskEventId,
          })

          return nextKey
        }

        if (existingState?.pending) {
          inlineToolKeysRef.current.set(pendingKey, {
            ...existingState,
            pending: false,
            eventId: event.taskEventId ?? existingState.eventId,
          })

          return existingState.latestKey
        }

        if (event.taskEventId && existingState?.eventId === event.taskEventId) {
          return existingState.latestKey
        }

        const count = (existingState?.count ?? 0) + 1
        const nextKey = event.taskEventId
          ? `inline-tool-${event.taskEventId}`
          : `inline-tool-${pendingKey}-${count}`

        // 兜底处理缺少 called 的完成事件，避免结果事件被静默丢失。
        inlineToolKeysRef.current.set(pendingKey, {
          count,
          latestKey: nextKey,
          pending: false,
          eventId: event.taskEventId,
        })

        return nextKey
      }

      const upsertAssistantRuntimeBlock = (
        nextBlock: InlineToolUseBlock,
        event: TaskStreamEvent,
      ) => {
        const key = getAssistantDraftKey(runId)

        setStreamMessages((prev) => {
          const existingIndex = prev.findIndex((item) => item.key === key)

          if (existingIndex < 0) {
            return [
              ...prev,
              {
                key,
                appId: event.appId ?? appId,
                taskId: event.taskId ?? runId,
                role: 'ASSISTANT',
                contentType: 'TEXT',
                content: '',
                blocks: [nextBlock],
                createdAt: event.createdAt,
                streaming: true,
              },
            ]
          }

          const nextMessages = [...prev]
          const existingMessage = nextMessages[existingIndex]
          const blocks = upsertBlock(existingMessage.blocks, nextBlock)

          nextMessages[existingIndex] = {
            ...existingMessage,
            blocks,
            content: getBlocksText(blocks) ?? existingMessage.content,
            createdAt: event.createdAt ?? existingMessage.createdAt,
            streaming: true,
            pending: false,
          }

          return nextMessages
        })
      }

      const appendInlineCommandLog = (event: TaskStreamEvent) => {
        const key = getInlineCommandKey(event)
        const logText = normalizeText(event.content).trimEnd()

        if (!logText) {
          return
        }

        setStreamMessages((prev) => {
          const draftKey = getAssistantDraftKey(runId)
          const existingIndex = prev.findIndex((item) => item.key === draftKey)

          if (existingIndex < 0) {
            const commandBlock = buildCommandBlock(event, 'agent.command.started', key)

            return [
              ...prev,
              {
                key: draftKey,
                appId: event.appId ?? appId,
                taskId: event.taskId ?? runId,
                role: 'ASSISTANT',
                contentType: 'TEXT',
                content: '',
                blocks: [{ ...commandBlock, logs: [logText], summary: getPreview(logText) }],
                createdAt: event.createdAt,
                streaming: true,
              },
            ]
          }

          const nextMessages = [...prev]
          const existingMessage = nextMessages[existingIndex]
          const hasCommandBlock = existingMessage.blocks?.some(
            (block) => block.type === 'tool_use' && block.key === key,
          )
          const blocks = hasCommandBlock
            ? appendBlockLog(existingMessage.blocks, key, logText)
            : upsertBlock(existingMessage.blocks, {
                ...buildCommandBlock(event, 'agent.command.started', key),
                logs: [logText],
                summary: getPreview(logText),
              })

          nextMessages[existingIndex] = {
            ...existingMessage,
            blocks,
            content: getBlocksText(blocks) ?? existingMessage.content,
            createdAt: event.createdAt ?? existingMessage.createdAt,
            streaming: true,
            pending: false,
          }

          return nextMessages
        })
      }

      const appendAssistantRuntimeBlock = (event: TaskStreamEvent, eventType: string) => {
        // 只把能对齐最终 BLOCKS 的运行事件投影进正文；阶段和状态仍由工作台头部承担。
        if (eventType === 'command-log') {
          appendInlineCommandLog(event)
          return
        }

        if (eventType.startsWith('agent.command.')) {
          upsertAssistantRuntimeBlock(
            buildCommandBlock(event, eventType, getInlineCommandKey(event)),
            event,
          )
          return
        }

        if (eventType.startsWith('agent.validation.')) {
          const key = event.taskEventId
            ? `inline-validation-${event.taskEventId}`
            : `inline-validation-${event.taskId ?? runId}`

          upsertAssistantRuntimeBlock(buildValidationBlock(event, eventType, key), event)
          return
        }

        if (eventType.startsWith('agent.tool.')) {
          upsertAssistantRuntimeBlock(
            buildToolBlock(event, eventType, getInlineToolKey(event, eventType)),
            event,
          )
        }
      }

      const appendRuntimeDetail = (event: TaskStreamEvent) => {
        const detailKey = event.taskEventId
          ? `task-event-${event.taskEventId}-${event.eventType}`
          : event.eventType === 'state'
            ? `state-${runId}-${event.status ?? 'status'}-${event.currentStep ?? 'step'}`
            : undefined

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
                if (!assistantFinalized) {
                  appendAssistantDelta(event)
                }
              } else if (eventType === 'assistant.completed' || eventType === 'message') {
                if (isAssistantFinalEvent(event, eventType)) {
                  assistantFinalized = true
                  shouldRemoveAssistantDraftOnFinish =
                    shouldRemoveAssistantDraftOnFinish || Boolean(event.messageId)
                }

                upsertStreamMessage(event, eventType)
              } else if (isRuntimeDetailEvent(eventType)) {
                // 最终 BLOCKS 是权威聊天内容；完成后运行事件只进明细，避免重建草稿气泡。
                if (!assistantFinalized) {
                  appendAssistantRuntimeBlock(event, eventType)
                }

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
    inlineCommandKeysRef.current.clear()
    inlineToolKeysRef.current.clear()

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
