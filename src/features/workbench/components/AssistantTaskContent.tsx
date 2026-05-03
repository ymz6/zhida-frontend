import { XMarkdown } from '@ant-design/x-markdown'
import '@ant-design/x-markdown/themes/light.css'
import { Collapse, Tag } from 'antd'
import { Box, FilePenLine, Terminal } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  getDetailSummary,
  getMetadataText,
  type ConversationDetailItem,
  type TaskConversationGroup,
} from '../utils/conversationTimeline'
import { parseMessageMetadata } from '../types'
import { TaskProgress } from './TaskProgress'

function getBooleanMetadataValue(value: unknown) {
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

  return undefined
}

function getMetadataStatusTags(metadata: string | undefined) {
  const parsedMetadata = parseMessageMetadata(metadata)

  if (!parsedMetadata) {
    return []
  }

  const tags: Array<{ key: string; label: ReactNode; color?: string }> = []
  const success = getBooleanMetadataValue(parsedMetadata.success)
  const isError = getBooleanMetadataValue(parsedMetadata.isError)
  const isFinished = getBooleanMetadataValue(parsedMetadata.isFinished)
  const exitCode = parsedMetadata.exitCode

  if (success !== undefined) {
    tags.push({
      key: 'success',
      label: success ? '成功' : '失败',
      color: success ? 'success' : 'error',
    })
  }

  if (isError !== undefined) {
    tags.push({
      key: 'isError',
      label: isError ? '有错误' : '无错误',
      color: isError ? 'error' : 'success',
    })
  }

  if (isFinished !== undefined) {
    tags.push({
      key: 'isFinished',
      label: isFinished ? '已完成' : '未完成',
      color: isFinished ? 'success' : 'processing',
    })
  }

  if (typeof exitCode === 'number' || typeof exitCode === 'string') {
    const exitCodeNumber = Number(exitCode)

    tags.push({
      key: 'exitCode',
      label: `退出码 ${String(exitCode)}`,
      color: exitCodeNumber === 0 ? 'success' : Number.isNaN(exitCodeNumber) ? 'default' : 'error',
    })
  }

  return tags
}

function DetailStatusTags({ metadata }: { metadata?: string }) {
  const tags = getMetadataStatusTags(metadata)

  if (tags.length === 0) {
    return null
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <Tag
          key={tag.key}
          color={tag.color}
          className="m-0"
        >
          {tag.label}
        </Tag>
      ))}
    </div>
  )
}

function isLogDetail(item: ConversationDetailItem) {
  return item.detailType === 'BUILD_LOG' || item.eventType === 'command-log'
}

function DetailHeader({
  icon,
  item,
  summary,
}: {
  icon: ReactNode
  item: ConversationDetailItem
  summary: ReturnType<typeof getDetailSummary>
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm leading-6">
      <span className="flex shrink-0 items-center text-slate-400">{icon}</span>
      <span className="min-w-0 truncate font-medium text-slate-700">{summary.primary}</span>
      {summary.secondary && (
        <span className="min-w-0 truncate font-mono text-xs text-slate-400">
          {summary.secondary}
        </span>
      )}
      <DetailStatusTags metadata={item.metadata} />
    </div>
  )
}

function LogDetailBlock({ item }: { item: ConversationDetailItem }) {
  const summary = getDetailSummary(item)
  const metadataText = getMetadataText(item.metadata)
  const logText = item.logs?.filter(Boolean).join('\n') ?? ''
  const detailText = [logText || item.content, metadataText].filter(Boolean).join('\n\n')
  const lineCount = (logText || item.content).split('\n').filter(Boolean).length

  return (
    <Collapse
      ghost
      size="small"
      expandIconPosition="end"
      className="rounded-lg bg-slate-50 ring-1 ring-slate-200 [&_.ant-collapse-content-box]:px-3 [&_.ant-collapse-content-box]:pb-3 [&_.ant-collapse-header]:px-3 [&_.ant-collapse-header]:py-2"
      items={[
        {
          key: item.key,
          label: (
            <DetailHeader
              icon={
                <Terminal
                  className="size-3.5"
                  aria-hidden="true"
                />
              }
              item={item}
              summary={{
                primary: summary.primary,
                secondary: lineCount > 0 ? `${lineCount} 行日志` : summary.secondary,
              }}
            />
          ),
          children: (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950 px-3 py-2 font-mono text-xs leading-5 text-slate-100">
              {detailText || '暂无日志内容'}
            </pre>
          ),
        },
      ]}
    />
  )
}

function ToolDetailBlock({ item }: { item: ConversationDetailItem }) {
  const summary = getDetailSummary(item)
  const metadataText = getMetadataText(item.metadata)
  const isFileLike = Boolean(summary.secondary && summary.secondary.includes('/'))
  const Icon = isFileLike ? FilePenLine : Box

  return (
    <div className="space-y-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <DetailHeader
        icon={
          <Icon
            className="size-3.5"
            aria-hidden="true"
          />
        }
        item={item}
        summary={summary}
      />
      {item.content ? (
        <AssistantMarkdownContent content={item.content} />
      ) : metadataText ? (
        <pre className="overflow-auto whitespace-pre-wrap break-words rounded-md bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-500 ring-1 ring-slate-200">
          {metadataText}
        </pre>
      ) : null}
    </div>
  )
}

function AssistantMarkdownContent({ content }: { content: string }) {
  return (
    <XMarkdown
      content={content}
      className="x-markdown-light"
      openLinksInNewTab
      escapeRawHtml
    />
  )
}

export function AssistantTaskContent({
  group,
  showProgress,
  taskStatus,
  currentStep,
  isStreaming,
}: {
  group: TaskConversationGroup
  showProgress?: boolean
  taskStatus?: string
  currentStep?: string
  isStreaming?: boolean
}) {
  return (
    <div className="space-y-3">
      {group.timelineItems.map((item) =>
        item.type === 'message' ? (
          <AssistantMarkdownContent
            key={item.key}
            content={item.content}
          />
        ) : isLogDetail(item) ? (
          <LogDetailBlock
            key={item.key}
            item={item}
          />
        ) : (
          <ToolDetailBlock
            key={item.key}
            item={item}
          />
        ),
      )}

      {showProgress && (
        <TaskProgress
          status={taskStatus}
          currentStep={currentStep}
          isStreaming={isStreaming}
        />
      )}
    </div>
  )
}
