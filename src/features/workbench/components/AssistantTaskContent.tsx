import { XMarkdown } from '@ant-design/x-markdown'
import '@ant-design/x-markdown/themes/light.css'
import { Box, FilePenLine, Terminal } from 'lucide-react'

import {
  getDetailSummary,
  getMetadataText,
  type ConversationDetailItem,
  type TaskConversationGroup,
} from '../utils/conversationTimeline'
import { TaskProgress } from './TaskProgress'

function InlineDetailBlock({ item }: { item: ConversationDetailItem }) {
  const summary = getDetailSummary(item)
  const metadataText = getMetadataText(item.metadata)
  const logText = item.logs?.filter(Boolean).join('\n') ?? ''
  const detailText = [logText || item.content, metadataText].filter(Boolean).join('\n\n')
  const isCommand = item.detailType === 'BUILD_LOG' || item.eventType === 'command-log'
  const isFileLike = Boolean(summary.secondary && summary.secondary.includes('/'))
  const Icon = isCommand ? Terminal : isFileLike ? FilePenLine : Box

  return (
    <div
      title={detailText || summary.primary}
      className="flex min-w-0 items-center gap-2 py-1 text-sm leading-6 text-slate-500"
    >
      <Icon
        className="size-3.5 shrink-0 text-slate-400"
        aria-hidden="true"
      />
      <span className="min-w-0 truncate font-medium text-slate-600">{summary.primary}</span>
      {summary.secondary && (
        <span className="min-w-0 truncate font-mono text-xs text-slate-300">
          {summary.secondary}
        </span>
      )}
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
        ) : (
          <InlineDetailBlock
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
