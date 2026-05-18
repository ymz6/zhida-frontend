import { Think } from '@ant-design/x'
import { XMarkdown } from '@ant-design/x-markdown'
import { CheckCircle, CircleDashed, Wrench, XCircle } from 'lucide-react'

import {
  parseAppConversationTranscript,
  type AppConversationTranscriptBlock,
} from '../utils/appConversationTranscript'

export function AppAssistantMessageContent({
  content,
  isGenerating,
}: {
  content: string
  isGenerating?: boolean
}) {
  const blocks = parseAppConversationTranscript(content)

  return (
    <div className="space-y-2 text-sm leading-6 text-slate-700">
      {blocks.map((block, index) => (
        <AppAssistantTranscriptBlock
          key={`${block.type}-${index}`}
          block={block}
          hasNextChunk={Boolean(isGenerating && index === blocks.length - 1)}
        />
      ))}
    </div>
  )
}

function AppAssistantTranscriptBlock({
  block,
  hasNextChunk,
}: {
  block: AppConversationTranscriptBlock
  hasNextChunk: boolean
}) {
  if (block.type === 'text') {
    return (
      <AppAssistantMarkdown
        content={block.content}
        hasNextChunk={hasNextChunk}
      />
    )
  }

  if (block.type === 'thinking') {
    return (
      <Think
        title="思考过程"
        defaultExpanded={hasNextChunk || block.streaming}
        loading={hasNextChunk && block.streaming}
      >
        <AppAssistantMarkdown
          content={block.content}
          hasNextChunk={hasNextChunk}
          className="x-markdown-light text-xs leading-5 text-slate-500"
        />
      </Think>
    )
  }

  if (block.type === 'tool-call') {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-600">
          {block.streaming ? (
            <CircleDashed className="size-3.5 animate-spin" />
          ) : (
            <Wrench className="size-3.5" />
          )}
          <span>{block.title || block.name || '工具调用'}</span>
        </div>
        <AppAssistantMarkdown
          content={block.content}
          hasNextChunk={hasNextChunk}
          className="x-markdown-light text-xs leading-5 text-slate-600"
        />
      </div>
    )
  }

  const ResultIcon = block.success ? CheckCircle : XCircle
  const resultClassName = block.success
    ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2'
    : 'rounded-md border border-rose-200 bg-rose-50 px-3 py-2'
  const headerClassName = block.success
    ? 'mb-1 flex items-center gap-2 text-xs font-medium text-emerald-700'
    : 'mb-1 flex items-center gap-2 text-xs font-medium text-rose-700'

  return (
    <div className={resultClassName}>
      <div className={headerClassName}>
        <ResultIcon className="size-3.5" />
        <span>{block.title || block.name || '工具结果'}</span>
      </div>
      <AppAssistantMarkdown
        content={block.content}
        hasNextChunk={hasNextChunk}
        className="x-markdown-light text-xs leading-5 text-slate-700"
      />
    </div>
  )
}

function AppAssistantMarkdown({
  content,
  hasNextChunk,
  className = 'x-markdown-light text-sm leading-6',
}: {
  content: string
  hasNextChunk: boolean
  className?: string
}) {
  if (!content) {
    return null
  }

  return (
    <XMarkdown
      content={content}
      className={className}
      openLinksInNewTab
      escapeRawHtml
      streaming={{
        hasNextChunk,
        enableAnimation: hasNextChunk,
        tail: hasNextChunk,
      }}
    />
  )
}
