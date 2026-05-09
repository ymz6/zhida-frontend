import type { AppChatMessageInfo } from '@/api/generated/models'

import { parseMessageMetadata, type RuntimeDetailEvent } from '../types'
import { getMessageTypeLabel, getTaskStatusLabel, getTaskStepLabel } from './status'

export interface WorkbenchChatMessageInfo extends AppChatMessageInfo {
  key?: string
  taskId?: string
  messageType?: string
  blocks?: ChatContentBlock[]
  pending?: boolean
  streaming?: boolean
}

export type ConversationActivityStatus = 'running' | 'success' | 'error' | 'info'

export type ChatContentBlock =
  | { type: 'text'; key?: string; text: string }
  | {
      type: 'tool_use'
      key?: string
      name: string
      input: unknown
      result?: string | null
      status?: ConversationActivityStatus
      path?: string
      summary?: string
      source?: 'tool' | 'command' | 'validation'
      logs?: string[]
      label?: string
      eventType?: string
    }

export type ChatMessageMetadata = {
  previewUrl?: string | null
  error?: {
    errorType: string
    detail: string
  } | null
}

export interface WorkbenchChatListItem extends WorkbenchChatMessageInfo {
  key: string
  role: 'USER' | 'ASSISTANT'
  contentType: 'TEXT' | 'BLOCKS'
  content: string
  sortValue: number
  order: number
}

export type ConversationActivityKind =
  | 'command'
  | 'tool'
  | 'stage'
  | 'validation'
  | 'run'
  | 'system'
  | 'event'

export interface ConversationActivityItem {
  type: 'activity'
  key: string
  kind: ConversationActivityKind
  label: string
  title: string
  description?: string
  content: string
  metadata?: string
  detailType?: string
  eventType?: string
  command?: string
  toolName?: string
  path?: string
  logs?: string[]
  latestLog?: string
  status: ConversationActivityStatus
  sortValue: number
  order: number
}

interface ConversationMessageItem {
  key: string
  content: string
  blocks?: ChatContentBlock[]
  streaming?: boolean
  sortValue: number
  order: number
}

export type TaskConversationTimelineItem =
  | ({
      type: 'message'
    } & ConversationMessageItem)
  | ConversationActivityItem

interface UserConversationItem {
  key: string
  content: string
  order: number
}

export interface TaskConversationGroup {
  key: string
  taskId?: string
  order: number
  userItems: UserConversationItem[]
  timelineItems: TaskConversationTimelineItem[]
}

const ANSI_PATTERN = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g

function normalizeText(content: string | undefined) {
  return (content ?? '').replace(ANSI_PATTERN, '').replace(/\r\n?/g, '\n')
}

function isDetailMessage(messageType: string | undefined) {
  return messageType === 'BUILD_LOG'
}

function getGroup(
  groups: Map<string, TaskConversationGroup>,
  key: string,
  order: number,
  taskId?: string,
) {
  const existingGroup = groups.get(key)

  if (existingGroup) {
    return existingGroup
  }

  const group: TaskConversationGroup = {
    key,
    taskId,
    order,
    userItems: [],
    timelineItems: [],
  }

  groups.set(key, group)

  return group
}

export function getMetadataText(metadata: string | undefined) {
  const parsedMetadata = parseMessageMetadata(metadata)

  if (!parsedMetadata) {
    return ''
  }

  return Object.entries(parsedMetadata)
    .map(
      ([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.map(String).join(' ') : String(value)}`,
    )
    .join('\n')
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

function getEventSortValue(createdAt: string | undefined, fallback: number) {
  if (!createdAt) {
    return fallback
  }

  const timestamp = Date.parse(createdAt.replace(' ', 'T'))

  return Number.isNaN(timestamp) ? fallback : timestamp
}

function getPreview(content: string | undefined, length = 80) {
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

function getCommandFromDetail({ content, metadata }: { content?: string; metadata?: string }) {
  const parsedMetadata = parseMessageMetadata(metadata)
  const metadataCommand = getMetadataString(parsedMetadata, ['command', 'cmd'])

  return metadataCommand || getCommandFromContent(content)
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

function getPathFromText(text: string | undefined) {
  const pathMatch = normalizeText(text).match(/(?:[\w.-]+[\\/])+[\w.-]+\.[A-Za-z0-9]+/)

  return pathMatch?.[0] ?? ''
}

function getPathFromToolEvent(content: string | undefined, metadata: string | undefined) {
  const parsedMetadata = parseMessageMetadata(metadata)
  const metadataPath = getMetadataString(parsedMetadata, ['path', 'filePath', 'filename', 'file'])

  if (metadataPath) {
    return metadataPath
  }

  const parsedContent = getJsonObjectFromText(content)
  const contentPath = getMetadataString(parsedContent, ['path', 'filePath', 'filename', 'file'])

  return contentPath || getPathFromText(content)
}

function getFileName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
}

function getActivityStatus(eventType: string | undefined, metadata: string | undefined) {
  const parsedMetadata = parseMessageMetadata(metadata)
  const success = getMetadataBoolean(parsedMetadata, ['success'])
  const hasFailed = getMetadataBoolean(parsedMetadata, ['hasFailed', 'isError'])
  const exitCode = Number(getMetadataString(parsedMetadata, ['exitCode']))

  if (eventType?.endsWith('.started')) {
    return 'running'
  }

  if (eventType?.endsWith('.failed') || success === false || hasFailed === true) {
    return 'error'
  }

  if (!Number.isNaN(exitCode) && exitCode !== 0) {
    return 'error'
  }

  if (eventType?.endsWith('.succeeded') || success === true || hasFailed === false) {
    return 'success'
  }

  return 'info'
}

function getRuntimeEventLabel(eventType: string | undefined) {
  if (!eventType) {
    return '运行明细'
  }

  if (eventType === 'command-log') {
    return '命令日志'
  }

  if (eventType === 'state') {
    return '状态'
  }

  if (eventType.startsWith('agent.command.')) {
    return '命令'
  }

  if (eventType.startsWith('agent.tool.')) {
    return '工具'
  }

  if (eventType.startsWith('agent.stage.')) {
    return '阶段'
  }

  if (eventType.startsWith('agent.validation.')) {
    return '校验'
  }

  if (eventType.startsWith('agent.run.')) {
    return '任务'
  }

  if (eventType.startsWith('agent.')) {
    return 'Agent'
  }

  return '运行明细'
}

function isNoisyLogLine(content: string, command?: string) {
  const trimmedContent = normalizeText(content).trim()

  return (
    !trimmedContent ||
    trimmedContent === command ||
    trimmedContent === `$ ${command}` ||
    /^[+\-=|\\/\s.]+$/.test(trimmedContent)
  )
}

function getLatestMeaningfulLog(logs: string[] | undefined, command?: string) {
  if (!logs) {
    return ''
  }

  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const log = logs[index]

    if (!isNoisyLogLine(log, command)) {
      return normalizeText(log).trim()
    }
  }

  return ''
}

function getCommandActivityKey(taskId: string | undefined, command: string) {
  return `command-${taskId ?? 'task'}-${command}`
}

function getToolPendingKey(taskId: string | undefined, toolName: string) {
  return `tool-pending-${taskId ?? 'task'}-${toolName}`
}

function getToolActivityKey({
  fallback,
  path,
  taskId,
  toolName,
}: {
  fallback: string
  path?: string
  taskId?: string
  toolName: string
}) {
  if (path) {
    return `tool-${taskId ?? 'task'}-${toolName}-${path}`
  }

  return fallback
}

function getActivityKind(eventType: string | undefined): ConversationActivityKind {
  if (eventType?.startsWith('agent.command.') || eventType === 'command-log') {
    return 'command'
  }

  if (eventType?.startsWith('agent.tool.')) {
    return 'tool'
  }

  if (eventType?.startsWith('agent.stage.')) {
    return 'stage'
  }

  if (eventType?.startsWith('agent.validation.')) {
    return 'validation'
  }

  if (eventType?.startsWith('agent.run.')) {
    return 'run'
  }

  return 'event'
}

function buildActivityTitle({
  command,
  content,
  eventType,
  kind,
  metadata,
  path,
  toolName,
}: {
  command?: string
  content?: string
  eventType?: string
  kind: ConversationActivityKind
  metadata?: string
  path?: string
  toolName?: string
}) {
  const parsedMetadata = parseMessageMetadata(metadata)

  if (kind === 'command') {
    return command || '命令日志'
  }

  if (kind === 'tool') {
    return path ? `${toolName || '工具'} · ${getFileName(path)}` : toolName || '工具调用'
  }

  if (kind === 'stage') {
    const stepLabel = getTaskStepLabel(getMetadataString(parsedMetadata, ['currentStep']))

    return stepLabel ? `阶段切换为 ${stepLabel}` : getPreview(content) || '阶段切换'
  }

  if (kind === 'validation') {
    return '执行项目校验'
  }

  if (kind === 'run') {
    const appName = getMetadataString(parsedMetadata, ['appName'])
    const scenario = getMetadataString(parsedMetadata, ['scenario'])

    return appName ? `开始处理 ${appName}` : scenario ? `Agent 执行 ${scenario}` : 'Agent 开始执行'
  }

  if (eventType === 'system-message') {
    return getPreview(content) || '系统消息'
  }

  return getPreview(content) || getRuntimeEventLabel(eventType)
}

function appendActivityLog(item: ConversationActivityItem, content: string | undefined) {
  const logText = normalizeText(content).trimEnd()

  if (!logText) {
    return
  }

  const logs = item.logs ?? []

  // 命令日志通常逐行推送，相邻重复行会让折叠内容显得抖动。
  if (logs.at(-1) === logText) {
    return
  }

  item.logs = [...logs, logText]
  item.latestLog = getLatestMeaningfulLog(item.logs, item.command)
}

function upsertActivity({
  activityItems,
  group,
  key,
  next,
}: {
  activityItems: Map<string, ConversationActivityItem>
  group: TaskConversationGroup
  key: string
  next: Omit<ConversationActivityItem, 'type' | 'key'>
}) {
  const existingItem = activityItems.get(key)

  if (existingItem) {
    existingItem.title = next.title || existingItem.title
    existingItem.description = next.description || existingItem.description
    existingItem.content = next.content || existingItem.content
    existingItem.metadata = next.metadata || existingItem.metadata
    existingItem.detailType = next.detailType || existingItem.detailType
    existingItem.eventType = next.eventType || existingItem.eventType
    existingItem.command = next.command || existingItem.command
    existingItem.toolName = next.toolName || existingItem.toolName
    existingItem.path = next.path || existingItem.path
    existingItem.status = next.status === 'info' ? existingItem.status : next.status
    existingItem.sortValue = Math.min(existingItem.sortValue, next.sortValue)
    existingItem.order = Math.min(existingItem.order, next.order)
    return existingItem
  }

  const activityItem: ConversationActivityItem = {
    ...next,
    type: 'activity',
    key,
  }

  activityItems.set(key, activityItem)
  group.timelineItems.push(activityItem)

  return activityItem
}

function appendSystemActivity({
  activityItems,
  group,
  key,
  message,
  order,
  sortValue,
}: {
  activityItems: Map<string, ConversationActivityItem>
  group: TaskConversationGroup
  key: string
  message: WorkbenchChatMessageInfo
  order: number
  sortValue: number
}) {
  upsertActivity({
    activityItems,
    group,
    key: `system-${key}`,
    next: {
      kind: 'system',
      label: '系统',
      title: buildActivityTitle({
        content: message.content,
        eventType: 'system-message',
        kind: 'event',
      }),
      content: normalizeText(message.content),
      metadata: message.metadata,
      detailType: message.messageType,
      eventType: 'system-message',
      status: 'info',
      sortValue,
      order,
    },
  })
}

function appendBuildLogActivity({
  activityItems,
  group,
  message,
  order,
  sortValue,
}: {
  activityItems: Map<string, ConversationActivityItem>
  group: TaskConversationGroup
  message: WorkbenchChatMessageInfo
  order: number
  sortValue: number
}) {
  const command = getCommandFromDetail({
    content: message.content,
    metadata: message.metadata,
  })
  const activityKey = command
    ? getCommandActivityKey(message.taskId, command)
    : `build-log-${message.id ?? `${message.taskId ?? 'message'}-${order}`}`
  const status = getActivityStatus('agent.command.succeeded', message.metadata)
  const activityItem = upsertActivity({
    activityItems,
    group,
    key: activityKey,
    next: {
      kind: command ? 'command' : 'event',
      label: getMessageTypeLabel(message.messageType),
      title: command || getPreview(message.content) || getMessageTypeLabel(message.messageType),
      content: normalizeText(message.content),
      metadata: message.metadata,
      detailType: message.messageType,
      command,
      status,
      sortValue,
      order,
    },
  })

  appendActivityLog(activityItem, message.content)
}

function appendRuntimeActivity({
  activityItems,
  detail,
  group,
  order,
  pendingToolItems,
  sortValue,
}: {
  activityItems: Map<string, ConversationActivityItem>
  detail: RuntimeDetailEvent
  group: TaskConversationGroup
  order: number
  pendingToolItems: Map<string, string>
  sortValue: number
}) {
  const eventType = detail.eventType
  const metadata = detail.metadata
  const kind = getActivityKind(eventType)
  const status = getActivityStatus(eventType, metadata)
  const stateContent =
    eventType === 'state'
      ? [
          getTaskStatusLabel(detail.status),
          detail.currentStep ? `当前步骤：${getTaskStepLabel(detail.currentStep)}` : '',
        ]
          .filter(Boolean)
          .join(' · ')
      : detail.content

  if (kind === 'command') {
    const command =
      getCommandFromDetail({
        content: detail.content,
        metadata,
      }) || '命令日志'
    const activityKey = getCommandActivityKey(detail.taskId, command)
    const activityItem = upsertActivity({
      activityItems,
      group,
      key: activityKey,
      next: {
        kind: 'command',
        label: getRuntimeEventLabel(eventType),
        title: buildActivityTitle({
          command,
          content: detail.content,
          eventType,
          kind: 'command',
          metadata,
        }),
        content: normalizeText(detail.content),
        metadata,
        detailType: detail.messageType,
        eventType,
        command,
        status,
        sortValue,
        order,
      },
    })

    if (eventType === 'command-log') {
      appendActivityLog(activityItem, detail.content)
    } else if (
      (eventType?.endsWith('.succeeded') || eventType?.endsWith('.failed')) &&
      !activityItem.logs?.length
    ) {
      appendActivityLog(activityItem, detail.content)
    }

    return
  }

  if (kind === 'tool') {
    const parsedMetadata = parseMessageMetadata(metadata)
    const toolName = getMetadataString(parsedMetadata, ['toolName', 'tool', 'name']) || '工具'
    const path = getPathFromToolEvent(detail.content, metadata)
    const pendingKey = getToolPendingKey(detail.taskId, toolName)
    const fallbackKey = detail.taskEventId
      ? `tool-event-${detail.taskEventId}`
      : `tool-${detail.taskId ?? 'task'}-${order}`
    const activityKey =
      eventType?.endsWith('.called') || path
        ? getToolActivityKey({
            fallback: fallbackKey,
            path,
            taskId: detail.taskId,
            toolName,
          })
        : (pendingToolItems.get(pendingKey) ?? fallbackKey)
    const activityItem = upsertActivity({
      activityItems,
      group,
      key: activityKey,
      next: {
        kind: 'tool',
        label: getRuntimeEventLabel(eventType),
        title: buildActivityTitle({
          content: detail.content,
          eventType,
          kind: 'tool',
          metadata,
          path,
          toolName,
        }),
        description: path,
        content: normalizeText(eventType?.endsWith('.called') ? '' : detail.content),
        metadata,
        detailType: detail.messageType,
        eventType,
        path,
        toolName,
        status,
        sortValue,
        order,
      },
    })

    if (eventType?.endsWith('.called')) {
      pendingToolItems.set(pendingKey, activityKey)
    }

    return
  }

  const activityKey = detail.taskEventId
    ? `activity-${detail.taskEventId}`
    : `activity-${detail.taskId ?? 'task'}-${order}`

  upsertActivity({
    activityItems,
    group,
    key: activityKey,
    next: {
      kind,
      label: getRuntimeEventLabel(eventType),
      title: buildActivityTitle({
        content: stateContent,
        eventType,
        kind,
        metadata,
      }),
      content: normalizeText(stateContent),
      metadata,
      detailType: detail.messageType,
      eventType,
      status,
      sortValue,
      order,
    },
  })
}

function sortTimelineItems(
  firstItem: TaskConversationTimelineItem,
  secondItem: TaskConversationTimelineItem,
) {
  if (firstItem.sortValue !== secondItem.sortValue) {
    return firstItem.sortValue - secondItem.sortValue
  }

  return firstItem.order - secondItem.order
}

export function getActivityDetailText(item: ConversationActivityItem) {
  const logText = item.logs?.filter(Boolean).join('\n') ?? ''
  const contentText = normalizeText(item.content)
  const metadataText = getMetadataText(item.metadata)

  return [logText || contentText, metadataText].filter(Boolean).join('\n\n')
}

export function getActivityLineCount(item: ConversationActivityItem) {
  const detailText = item.logs?.filter(Boolean).join('\n') || item.content

  return normalizeText(detailText)
    .split('\n')
    .filter((line) => line.trim()).length
}

export function getActivityDescription(item: ConversationActivityItem) {
  if (item.kind === 'command') {
    return item.latestLog || getPreview(item.content)
  }

  if (item.description) {
    return item.description
  }

  if (item.kind === 'tool') {
    return getPreview(item.content)
  }

  return getPreview(item.content)
}

export function buildTaskConversationGroups({
  persistedMessages,
  runtimeDetails,
  streamMessages,
}: {
  persistedMessages: AppChatMessageInfo[]
  runtimeDetails: RuntimeDetailEvent[]
  streamMessages: WorkbenchChatMessageInfo[]
}) {
  const groups = new Map<string, TaskConversationGroup>()
  const activityItems = new Map<string, ConversationActivityItem>()
  const pendingToolItems = new Map<string, string>()
  const seenMessageKeys = new Set<string>()
  const allMessages: WorkbenchChatMessageInfo[] = [...persistedMessages, ...streamMessages]

  allMessages.forEach((message, index) => {
    const messageKey = message.id ?? `${message.taskId ?? 'message'}-${message.createdAt ?? index}`

    if (seenMessageKeys.has(messageKey)) {
      return
    }

    seenMessageKeys.add(messageKey)

    if (!message.content && !isDetailMessage(message.messageType)) {
      return
    }

    const groupKey = message.taskId ? `task-${message.taskId}` : `message-${messageKey}`
    const sortValue = getEventSortValue(message.createdAt, index)
    const group = getGroup(groups, groupKey, sortValue, message.taskId)

    group.order = Math.min(group.order, sortValue)

    if (message.role === 'USER') {
      group.userItems.push({
        key: messageKey,
        content: message.content ?? '',
        order: index,
      })
      return
    }

    if (isDetailMessage(message.messageType)) {
      appendBuildLogActivity({
        activityItems,
        group,
        message,
        order: index,
        sortValue,
      })
      return
    }

    if (message.role === 'SYSTEM') {
      appendSystemActivity({
        activityItems,
        group,
        key: messageKey,
        message,
        order: index,
        sortValue,
      })
      return
    }

    group.timelineItems.push({
      type: 'message',
      key: messageKey,
      content: message.content ?? '',
      blocks: message.blocks,
      streaming: message.streaming,
      sortValue,
      order: index,
    })
  })

  runtimeDetails.forEach((detail, index) => {
    const groupKey = detail.taskId ? `task-${detail.taskId}` : 'runtime-details'
    const order = persistedMessages.length + streamMessages.length + index
    const sortValue = getEventSortValue(detail.createdAt, detail.receivedAt)
    const group = getGroup(groups, groupKey, sortValue, detail.taskId)

    group.order = Math.min(group.order, sortValue)

    appendRuntimeActivity({
      activityItems,
      detail,
      group,
      order,
      pendingToolItems,
      sortValue,
    })
  })

  return [...groups.values()]
    .map((group) => ({
      ...group,
      timelineItems: [...group.timelineItems].sort(sortTimelineItems),
      userItems: [...group.userItems].sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.order - b.order)
}

function isChatMessageRole(role: string | undefined): role is 'USER' | 'ASSISTANT' {
  return role === 'USER' || role === 'ASSISTANT'
}

function getChatContentType(
  contentType: string | undefined,
  role: 'USER' | 'ASSISTANT',
): 'TEXT' | 'BLOCKS' {
  if (contentType === 'BLOCKS') {
    return 'BLOCKS'
  }

  if (contentType === 'TEXT') {
    return 'TEXT'
  }

  return role === 'ASSISTANT' ? 'BLOCKS' : 'TEXT'
}

function getChatMessageKey(message: WorkbenchChatMessageInfo, index: number) {
  return message.id ?? message.key ?? `${message.role ?? 'message'}-${message.createdAt ?? index}`
}

export function parseChatMetadata(metadata: string | undefined): ChatMessageMetadata | null {
  const parsedMetadata = parseMessageMetadata(metadata)

  if (!parsedMetadata) {
    return null
  }

  const previewUrl =
    typeof parsedMetadata.previewUrl === 'string' ? parsedMetadata.previewUrl : undefined
  const rawError = parsedMetadata.error
  const error =
    rawError && typeof rawError === 'object' && !Array.isArray(rawError)
      ? (rawError as Record<string, unknown>)
      : null
  const detail = typeof error?.detail === 'string' ? error.detail : ''
  const errorType = typeof error?.errorType === 'string' ? error.errorType : 'UNKNOWN'

  return {
    previewUrl,
    error: detail ? { errorType, detail } : null,
  }
}

function isChatContentBlock(value: unknown): value is ChatContentBlock {
  if (!value || typeof value !== 'object') {
    return false
  }

  const block = value as Record<string, unknown>

  if (block.type === 'text') {
    return typeof block.text === 'string'
  }

  if (block.type === 'tool_use') {
    return typeof block.name === 'string'
  }

  return false
}

export function parseBlocks(
  message: Pick<WorkbenchChatMessageInfo, 'blocks' | 'content' | 'contentType'>,
) {
  // 流式阶段会先把 SSE 运行事件投影成 blocks，保证生成中和最终消息使用同一套渲染路径。
  if (message.blocks?.length && message.blocks.every(isChatContentBlock)) {
    return message.blocks
  }

  if (message.contentType !== 'BLOCKS') {
    return [{ type: 'text', text: message.content ?? '' }] satisfies ChatContentBlock[]
  }

  try {
    const parsed = JSON.parse(message.content ?? '')

    if (Array.isArray(parsed) && parsed.every(isChatContentBlock)) {
      return parsed
    }
  } catch {
    // 后端 BLOCKS 序列化异常时降级为纯文本，避免聊天区整页崩溃。
  }

  return [{ type: 'text', text: message.content ?? '' }] satisfies ChatContentBlock[]
}

export function buildWorkbenchChatMessages({
  persistedMessages,
  streamMessages,
}: {
  persistedMessages: AppChatMessageInfo[]
  streamMessages: WorkbenchChatMessageInfo[]
}) {
  const seenMessageKeys = new Set<string>()
  const buildChatListItem = (
    message: WorkbenchChatMessageInfo,
    index: number,
  ): WorkbenchChatListItem | null => {
    if (!isChatMessageRole(message.role)) {
      return null
    }

    const content = message.content ?? ''
    const hasBlocks = Boolean(message.blocks?.length)

    if (!content && !hasBlocks && !message.streaming && !message.pending) {
      return null
    }

    const key = getChatMessageKey(message, index)

    if (seenMessageKeys.has(key)) {
      return null
    }

    seenMessageKeys.add(key)

    return {
      ...message,
      key,
      role: message.role,
      contentType: getChatContentType(message.contentType, message.role),
      content,
      sortValue: getEventSortValue(message.createdAt, index),
      order: index,
    }
  }

  const persistedItems = persistedMessages
    .map((message, index) => buildChatListItem(message, index))
    .filter((message): message is WorkbenchChatListItem => Boolean(message))
    .sort((firstMessage, secondMessage) => {
      if (firstMessage.sortValue !== secondMessage.sortValue) {
        return firstMessage.sortValue - secondMessage.sortValue
      }

      return firstMessage.order - secondMessage.order
    })

  const streamOffset = persistedMessages.length
  const streamItems = streamMessages
    .map((message, index) => buildChatListItem(message, streamOffset + index))
    .filter((message): message is WorkbenchChatListItem => Boolean(message))
    // 实时草稿会被 SSE 事件时间反复更新，不能参与全局 createdAt 排序，否则气泡会跳动。
    .sort((firstMessage, secondMessage) => firstMessage.order - secondMessage.order)

  return [...persistedItems, ...streamItems]
}

export function buildRuntimeActivityItems(runtimeDetails: RuntimeDetailEvent[]) {
  return buildTaskConversationGroups({
    persistedMessages: [],
    runtimeDetails,
    streamMessages: [],
  })
    .flatMap((group) => group.timelineItems)
    .filter(
      (item): item is ConversationActivityItem =>
        item.type === 'activity' && item.kind !== 'system',
    )
    .sort(sortTimelineItems)
}
