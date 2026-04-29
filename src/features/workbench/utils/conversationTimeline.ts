import type { AppChatMessageInfo } from '@/api/generated/models'

import { parseMessageMetadata, type RuntimeDetailEvent } from '../types'
import { getMessageTypeLabel } from './status'

export interface ConversationDetailItem {
  key: string
  label: string
  content: string
  metadata?: string
  detailType?: string
  eventType?: string
  command?: string
  logs?: string[]
  latestLog?: string
  sortValue: number
  order: number
}

interface ConversationMessageItem {
  key: string
  content: string
  sortValue: number
  order: number
}

export type TaskConversationTimelineItem =
  | ({
      type: 'message'
    } & ConversationMessageItem)
  | ({
      type: 'detail'
    } & ConversationDetailItem)

type TaskConversationDetailTimelineItem = Extract<TaskConversationTimelineItem, { type: 'detail' }>

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

function isDetailMessage(messageType: string | undefined) {
  return messageType === 'TOOL_CALL' || messageType === 'TOOL_RESULT' || messageType === 'BUILD_LOG'
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
    .map(([key, value]) => `${key}: ${String(value)}`)
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

function getCommandFromContent(content: string) {
  const firstLine = content.split('\n').find((line) => line.trim())

  if (!firstLine) {
    return ''
  }

  const trimmedLine = firstLine.trim()

  return trimmedLine.startsWith('$ ') ? trimmedLine.slice(2).trim() : ''
}

function getCommandFromDetail({
  content,
  metadata,
}: {
  content: string | undefined
  metadata: string | undefined
}) {
  const parsedMetadata = parseMessageMetadata(metadata)
  const metadataCommand = getMetadataString(parsedMetadata, ['command', 'cmd'])

  return metadataCommand || getCommandFromContent(content ?? '')
}

function isCommandLogDetail({
  content,
  detailType,
  eventType,
  metadata,
}: {
  content?: string
  detailType?: string
  eventType?: string
  metadata?: string
}) {
  if (eventType === 'command-log') {
    return true
  }

  if (detailType === 'BUILD_LOG') {
    return Boolean(getCommandFromDetail({ content, metadata }))
  }

  return false
}

function getEventSortValue(createdAt: string | undefined, fallback: number) {
  if (!createdAt) {
    return fallback
  }

  const timestamp = Date.parse(createdAt.replace(' ', 'T'))

  return Number.isNaN(timestamp) ? fallback : timestamp
}

function getDetailPreview(content: string) {
  const firstLine = content.split('\n').find(Boolean)

  return firstLine ? firstLine.slice(0, 64) : ''
}

function isNoisyCommandLogLine(content: string, command?: string) {
  const trimmedContent = content.trim()

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

    if (!isNoisyCommandLogLine(log, command)) {
      return log.trim()
    }
  }

  return ''
}

function getPathFromText(text: string) {
  const pathMatch = text.match(/(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+/)

  return pathMatch?.[0] ?? ''
}

function getFileName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path
}

export function getDetailSummary(item: ConversationDetailItem) {
  const metadata = parseMessageMetadata(item.metadata)
  const command = item.command || getMetadataString(metadata, ['command', 'cmd'])
  const toolName = getMetadataString(metadata, ['toolName', 'tool', 'name'])
  const metadataPath = getMetadataString(metadata, ['path', 'filePath', 'filename', 'file'])
  const textPath = getPathFromText(item.content)
  const path = metadataPath || textPath
  const exitCode = getMetadataString(metadata, ['exitCode'])
  const success = getMetadataString(metadata, ['success'])
  const latestLog = item.latestLog || getLatestMeaningfulLog(item.logs, command)
  const preview = getDetailPreview(item.content)

  if (path) {
    return {
      primary: getFileName(path),
      secondary: path,
    }
  }

  if (command) {
    return {
      primary: command,
      secondary: exitCode ? `exit ${exitCode}` : success ? `success ${success}` : latestLog,
    }
  }

  if (toolName) {
    return {
      primary: toolName,
      secondary: preview,
    }
  }

  return {
    primary: preview || item.label,
    secondary: '',
  }
}

function getCommandLogGroupKey(taskId: string | undefined, command: string) {
  return `command-${taskId ?? 'task'}-${command}`
}

function appendCommandLogItem({
  commandLogItems,
  group,
  item,
  taskId,
}: {
  commandLogItems: Map<string, TaskConversationDetailTimelineItem>
  group: TaskConversationGroup
  item: ConversationDetailItem
  taskId?: string
}) {
  if (!item.command) {
    group.timelineItems.push({ ...item, type: 'detail' })
    return
  }

  const commandLogKey = getCommandLogGroupKey(taskId, item.command)
  const existingItem = commandLogItems.get(commandLogKey)

  if (existingItem) {
    existingItem.content = [existingItem.content, item.content].filter(Boolean).join('\n')
    existingItem.metadata = item.metadata || existingItem.metadata
    existingItem.logs = [...(existingItem.logs ?? []), item.content]
    existingItem.latestLog = getLatestMeaningfulLog(existingItem.logs, existingItem.command)
    existingItem.sortValue = Math.min(existingItem.sortValue, item.sortValue)
    existingItem.order = Math.min(existingItem.order, item.order)
    return
  }

  const nextItem: TaskConversationDetailTimelineItem = {
    ...item,
    type: 'detail',
    key: commandLogKey,
    logs: item.content ? [item.content] : [],
    latestLog: getLatestMeaningfulLog(item.content ? [item.content] : [], item.command),
  }

  commandLogItems.set(commandLogKey, nextItem)
  group.timelineItems.push(nextItem)
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

export function buildTaskConversationGroups({
  persistedMessages,
  runtimeDetails,
  streamMessages,
}: {
  persistedMessages: AppChatMessageInfo[]
  runtimeDetails: RuntimeDetailEvent[]
  streamMessages: AppChatMessageInfo[]
}) {
  const groups = new Map<string, TaskConversationGroup>()
  const commandLogItems = new Map<string, TaskConversationDetailTimelineItem>()
  const seenMessageKeys = new Set<string>()

  ;[...persistedMessages, ...streamMessages].forEach((message, index) => {
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
      const command =
        getCommandFromDetail({
          content: message.content,
          metadata: message.metadata,
        }) || '命令日志'
      const isCommandLog = isCommandLogDetail({
        content: message.content,
        detailType: message.messageType,
        metadata: message.metadata,
      })
      const detailItem: ConversationDetailItem = {
        key: messageKey,
        label: getMessageTypeLabel(message.messageType),
        content: message.content ?? '',
        metadata: message.metadata,
        detailType: message.messageType,
        command: isCommandLog ? command : undefined,
        sortValue,
        order: index,
      }

      if (detailItem.command) {
        appendCommandLogItem({
          commandLogItems,
          group,
          item: detailItem,
          taskId: message.taskId,
        })
      } else {
        group.timelineItems.push({
          ...detailItem,
          type: 'detail',
        })
      }
      return
    }

    group.timelineItems.push({
      type: 'message',
      key: messageKey,
      content: message.content ?? '',
      sortValue,
      order: index,
    })
  })

  runtimeDetails.forEach((detail, index) => {
    const groupKey = detail.taskId ? `task-${detail.taskId}` : 'runtime-details'
    const order = persistedMessages.length + streamMessages.length + index
    const sortValue = getEventSortValue(detail.createdAt, detail.receivedAt)
    const group = getGroup(groups, groupKey, sortValue, detail.taskId)

    const command =
      getCommandFromDetail({
        content: detail.content,
        metadata: detail.metadata,
      }) || '命令日志'
    const isCommandLog = isCommandLogDetail({
      content: detail.content,
      detailType: detail.messageType,
      eventType: detail.eventType,
      metadata: detail.metadata,
    })
    const detailItem: ConversationDetailItem = {
      key: detail.id,
      label: detail.eventType === 'agent-trace' ? 'Agent Trace' : '命令日志',
      content: detail.content ?? '',
      metadata: detail.metadata,
      eventType: detail.eventType,
      detailType: detail.messageType,
      command: isCommandLog ? command : undefined,
      sortValue,
      order,
    }

    group.order = Math.min(group.order, sortValue)

    if (detailItem.command) {
      appendCommandLogItem({
        commandLogItems,
        group,
        item: detailItem,
        taskId: detail.taskId,
      })
    } else {
      group.timelineItems.push({
        ...detailItem,
        type: 'detail',
      })
    }
  })

  return [...groups.values()]
    .map((group) => ({
      ...group,
      timelineItems: [...group.timelineItems].sort(sortTimelineItems),
      userItems: [...group.userItems].sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.order - b.order)
}
