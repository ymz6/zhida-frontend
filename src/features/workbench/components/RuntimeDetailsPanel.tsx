import { Collapse, Tag } from 'antd'
import {
  Box,
  CircleCheck,
  CircleX,
  Clock3,
  FilePenLine,
  GitBranch,
  Info,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wrench,
} from 'lucide-react'

import {
  getActivityDescription,
  getActivityDetailText,
  getActivityLineCount,
  parseMessageMetadata,
  type ConversationActivityItem,
  type ConversationActivityStatus,
} from '../utils/conversationTimeline'

const runtimePanelKey = 'runtime-details'

function getMetadataString(metadata: string | undefined, key: string) {
  const parsedMetadata = parseMessageMetadata(metadata)
  const value = parsedMetadata?.[key]

  if (Array.isArray(value)) {
    return value.map(String).join(' ')
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

function formatDuration(milliseconds: string) {
  const duration = Number(milliseconds)

  if (Number.isNaN(duration) || duration <= 0) {
    return ''
  }

  if (duration < 1000) {
    return `${duration}ms`
  }

  return `${(duration / 1000).toFixed(duration >= 10000 ? 0 : 1)}s`
}

function getStatusMeta(status: ConversationActivityStatus) {
  if (status === 'error') {
    return {
      icon: (
        <CircleX
          className="size-3.5"
          aria-hidden="true"
        />
      ),
      label: '失败',
      color: 'error',
      textClassName: 'text-red-600',
    }
  }

  if (status === 'success') {
    return {
      icon: (
        <CircleCheck
          className="size-3.5"
          aria-hidden="true"
        />
      ),
      label: '成功',
      color: 'success',
      textClassName: 'text-emerald-600',
    }
  }

  if (status === 'running') {
    return {
      icon: (
        <Clock3
          className="size-3.5"
          aria-hidden="true"
        />
      ),
      label: '执行中',
      color: 'processing',
      textClassName: 'text-indigo-600',
    }
  }

  return {
    icon: (
      <Info
        className="size-3.5"
        aria-hidden="true"
      />
    ),
    label: '记录',
    color: 'default',
    textClassName: 'text-slate-500',
  }
}

function ActivityIcon({ item }: { item: ConversationActivityItem }) {
  if (item.kind === 'command') {
    return (
      <Terminal
        className="size-3.5"
        aria-hidden="true"
      />
    )
  }

  if (item.kind === 'tool') {
    const Icon = item.path ? FilePenLine : Wrench

    return (
      <Icon
        className="size-3.5"
        aria-hidden="true"
      />
    )
  }

  if (item.kind === 'stage') {
    return (
      <GitBranch
        className="size-3.5"
        aria-hidden="true"
      />
    )
  }

  if (item.kind === 'validation') {
    return (
      <ShieldCheck
        className="size-3.5"
        aria-hidden="true"
      />
    )
  }

  if (item.kind === 'run') {
    return (
      <Sparkles
        className="size-3.5"
        aria-hidden="true"
      />
    )
  }

  if (item.kind === 'system') {
    return (
      <Info
        className="size-3.5"
        aria-hidden="true"
      />
    )
  }

  return (
    <Box
      className="size-3.5"
      aria-hidden="true"
    />
  )
}

function ActivityTags({ item }: { item: ConversationActivityItem }) {
  const statusMeta = getStatusMeta(item.status)
  const exitCode = getMetadataString(item.metadata, 'exitCode')
  const duration = formatDuration(getMetadataString(item.metadata, 'durationMillis'))

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      <Tag
        color={statusMeta.color}
        className="m-0"
      >
        {statusMeta.label}
      </Tag>
      {exitCode && <Tag className="m-0">退出码 {exitCode}</Tag>}
      {duration && <Tag className="m-0">{duration}</Tag>}
    </div>
  )
}

function ActivityHeader({ item }: { item: ConversationActivityItem }) {
  const statusMeta = getStatusMeta(item.status)
  const description = getActivityDescription(item)

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2">
      <span className={`mt-1 flex shrink-0 items-center ${statusMeta.textClassName}`}>
        {statusMeta.icon}
      </span>
      <span className="mt-1 flex shrink-0 items-center text-slate-400">
        <ActivityIcon item={item} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 truncate text-sm font-medium text-slate-700">{item.title}</span>
          <span className="text-xs text-slate-400">{item.label}</span>
        </span>
        {description && (
          <span className="mt-0.5 block truncate font-mono text-xs leading-5 text-slate-400">
            {description}
          </span>
        )}
      </span>
      <ActivityTags item={item} />
    </div>
  )
}

function shouldShowActivityDetail(item: ConversationActivityItem, detailText: string) {
  if (!detailText.trim()) {
    return false
  }

  if (item.kind === 'command' || item.kind === 'tool') {
    return true
  }

  return detailText.trim() !== item.title
}

function ActivityDetail({ item }: { item: ConversationActivityItem }) {
  const detailText = getActivityDetailText(item)
  const lineCount = getActivityLineCount(item)
  const shouldShowDetail = shouldShowActivityDetail(item, detailText)

  if (!shouldShowDetail) {
    return null
  }

  return (
    <Collapse
      ghost
      size="small"
      expandIconPlacement="end"
      className="mt-2 rounded-md bg-white ring-1 ring-slate-200"
      items={[
        {
          key: item.key,
          label: (
            <span className="text-xs font-medium text-slate-500">
              {item.kind === 'command'
                ? lineCount > 0
                  ? `${lineCount} 行日志`
                  : '命令详情'
                : '查看详情'}
            </span>
          ),
          classNames: {
            header: 'px-3! py-1.5!',
            body: 'px-3! pb-3! pt-0!',
          },
          children: (
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950 px-3 py-2 font-mono text-xs leading-5 text-slate-100">
              {detailText}
            </pre>
          ),
        },
      ]}
    />
  )
}

function ActivityRow({ item }: { item: ConversationActivityItem }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <ActivityHeader item={item} />
      <ActivityDetail item={item} />
    </div>
  )
}

function RuntimeSummary({ items }: { items: ConversationActivityItem[] }) {
  const commandCount = items.filter((item) => item.kind === 'command').length
  const toolCount = items.filter((item) => item.kind === 'tool').length
  const errorCount = items.filter((item) => item.status === 'error').length
  const runningCount = items.filter((item) => item.status === 'running').length
  const logLineCount = items.reduce((count, item) => count + getActivityLineCount(item), 0)

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
      <span className="flex shrink-0 items-center text-indigo-500">
        <Sparkles
          className="size-3.5"
          aria-hidden="true"
        />
      </span>
      <span className="font-medium text-slate-700">运行明细</span>
      <span className="text-xs text-slate-400">{items.length} 项</span>
      {commandCount > 0 && <Tag className="m-0">{commandCount} 条命令</Tag>}
      {toolCount > 0 && <Tag className="m-0">{toolCount} 次工具</Tag>}
      {logLineCount > 0 && <Tag className="m-0">{logLineCount} 行日志</Tag>}
      {runningCount > 0 && (
        <Tag
          color="processing"
          className="m-0"
        >
          执行中
        </Tag>
      )}
      {errorCount > 0 && (
        <Tag
          color="error"
          className="m-0"
        >
          {errorCount} 项失败
        </Tag>
      )}
    </div>
  )
}

export function RuntimeDetailsPanel({
  compact,
  items,
}: {
  compact?: boolean
  items: ConversationActivityItem[]
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <Collapse
      ghost
      size="small"
      expandIconPlacement="end"
      className={
        compact
          ? 'rounded-md bg-transparent text-slate-500 before:hidden [&_.ant-collapse-content-box]:px-0!'
          : 'rounded-lg bg-slate-50 ring-1 ring-slate-200'
      }
      items={[
        {
          key: runtimePanelKey,
          label: compact ? (
            <span className="text-xs font-medium text-slate-400">查看完整运行明细</span>
          ) : (
            <RuntimeSummary items={items} />
          ),
          classNames: {
            header: compact ? 'px-0! py-1!' : 'px-3! py-2!',
            body: compact ? 'px-0! pb-0! pt-1!' : 'px-3! pb-3! pt-0!',
          },
          children: (
            <div className="space-y-2">
              {items.map((item) => (
                <ActivityRow
                  key={item.key}
                  item={item}
                />
              ))}
            </div>
          ),
        },
      ]}
    />
  )
}
