import { XMarkdown } from '@ant-design/x-markdown'
import '@ant-design/x-markdown/themes/light.css'
import { Alert, Collapse } from 'antd'
import {
  CheckCircle2,
  Clock3,
  FilePenLine,
  ShieldCheck,
  Terminal,
  Wrench,
  XCircle,
} from 'lucide-react'

import {
  parseBlocks,
  parseChatMetadata,
  type ChatContentBlock,
  type ConversationActivityStatus,
  type WorkbenchChatListItem,
} from '../utils/conversationTimeline'

type ToolUseContentBlock = Extract<ChatContentBlock, { type: 'tool_use' }>

function formatJson(value: unknown) {
  try {
    const formatted = JSON.stringify(value ?? {}, null, 2)

    return formatted ?? String(value)
  } catch {
    return String(value)
  }
}

function getFirstMeaningfulLine(value: string | null | undefined) {
  return value
    ?.split(/\r?\n/)
    .find((line) => line.trim())
    ?.trim()
}

function getInputString(input: unknown, keys: string[]) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return ''
  }

  const record = input as Record<string, unknown>

  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
  }

  return ''
}

function getToolPath(block: ToolUseContentBlock) {
  return block.path || getInputString(block.input, ['path', 'filePath', 'filename', 'file'])
}

function getToolStatus(block: ToolUseContentBlock): ConversationActivityStatus {
  if (block.status) {
    return block.status
  }

  if (block.result === null) {
    return 'info'
  }

  return block.result ? 'success' : 'info'
}

function getToolStatusMeta(status: ConversationActivityStatus) {
  if (status === 'running') {
    return {
      icon: (
        <Clock3
          className="size-3.5"
          aria-hidden="true"
        />
      ),
      label: '执行中',
      textClassName: 'text-indigo-600',
      cardClassName: 'bg-indigo-50/60 ring-indigo-100',
    }
  }

  if (status === 'success') {
    return {
      icon: (
        <CheckCircle2
          className="size-3.5"
          aria-hidden="true"
        />
      ),
      label: '完成',
      textClassName: 'text-emerald-600',
      cardClassName: 'bg-white ring-slate-200',
    }
  }

  if (status === 'error') {
    return {
      icon: (
        <XCircle
          className="size-3.5"
          aria-hidden="true"
        />
      ),
      label: '失败',
      textClassName: 'text-red-600',
      cardClassName: 'bg-red-50/70 ring-red-200',
    }
  }

  return {
    icon: (
      <Wrench
        className="size-3.5"
        aria-hidden="true"
      />
    ),
    label: '记录',
    textClassName: 'text-slate-500',
    cardClassName: 'bg-white ring-slate-200',
  }
}

function getToolKindMeta(block: ToolUseContentBlock) {
  if (block.source === 'command') {
    return {
      icon: (
        <Terminal
          className="size-3.5"
          aria-hidden="true"
        />
      ),
      label: block.label ?? '命令',
    }
  }

  if (block.source === 'validation') {
    return {
      icon: (
        <ShieldCheck
          className="size-3.5"
          aria-hidden="true"
        />
      ),
      label: block.label ?? '校验',
    }
  }

  const Icon = getToolPath(block) ? FilePenLine : Wrench

  return {
    icon: (
      <Icon
        className="size-3.5"
        aria-hidden="true"
      />
    ),
    label: block.label ?? '工具调用',
  }
}

function getToolResultText(block: ToolUseContentBlock) {
  if (typeof block.result === 'string' && block.result.trim()) {
    return block.result
  }

  const status = getToolStatus(block)

  if (status === 'running') {
    return '等待结果'
  }

  if (status === 'error') {
    return '执行失败或无结果'
  }

  return block.result === null ? '无结果' : '执行完成'
}

function getToolSummary(block: ToolUseContentBlock) {
  const path = getToolPath(block)

  if (path) {
    return path
  }

  if (block.summary) {
    return block.summary
  }

  return getFirstMeaningfulLine(block.result) ?? getToolResultText(block)
}

function AssistantMarkdownContent({
  content,
  streaming,
}: {
  content: string
  streaming?: boolean
}) {
  return (
    <XMarkdown
      content={content}
      className="x-markdown-light"
      openLinksInNewTab
      escapeRawHtml
      // 流式态必须随 SSE 生命周期关闭，避免 Markdown 尾块一直停留在未完成状态。
      streaming={{
        hasNextChunk: Boolean(streaming),
        enableAnimation: Boolean(streaming),
        tail: streaming ? { content: '|' } : false,
      }}
    />
  )
}

function DetailBlock({ title, value, dark }: { title: string; value: string; dark?: boolean }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-500">{title}</div>
      <pre
        className={
          dark
            ? 'max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950 px-3 py-2 font-mono text-xs leading-5 text-slate-100'
            : 'max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-600 ring-1 ring-slate-200'
        }
      >
        {value}
      </pre>
    </div>
  )
}

function AssistantPendingContent() {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-500 ring-1 ring-slate-200">
      <Clock3
        className="size-3.5 animate-pulse text-indigo-500"
        aria-hidden="true"
      />
      <span>正在思考，准备处理你的请求...</span>
    </div>
  )
}

function ToolUseBlock({ block }: { block: ToolUseContentBlock }) {
  const status = getToolStatus(block)
  const statusMeta = getToolStatusMeta(status)
  const kindMeta = getToolKindMeta(block)
  const displayPath = getToolPath(block)
  const summary = getToolSummary(block)
  const resultText = getToolResultText(block)
  const logsText = block.logs?.filter(Boolean).join('\n')
  const shouldShowResult = Boolean(resultText.trim() && resultText.trim() !== logsText?.trim())

  return (
    <Collapse
      ghost
      size="small"
      expandIconPlacement="end"
      // 工具详情默认折叠，主线只保留摘要，避免打断 AI 回复阅读。
      className={`rounded-lg ring-1 [&_.ant-collapse-content-box]:pt-0! [&_.ant-collapse-header-text]:min-w-0! [&_.ant-collapse-header-text]:flex-1! ${statusMeta.cardClassName}`}
      items={[
        {
          key: block.key ?? `${block.name}-tool-use`,
          label: (
            <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`flex shrink-0 items-center ${statusMeta.textClassName}`}
                  title={statusMeta.label}
                  aria-label={statusMeta.label}
                >
                  {statusMeta.icon}
                </span>
                <span
                  className="flex shrink-0 items-center text-slate-400"
                  title={kindMeta.label}
                  aria-label={kindMeta.label}
                >
                  {kindMeta.icon}
                </span>
                <span className="min-w-0 max-w-28 truncate font-medium text-slate-700">
                  {block.name}
                </span>
              </span>
              <span
                title={summary}
                className={`min-w-0 truncate text-right text-xs text-slate-400 ${
                  displayPath ? 'font-mono' : ''
                }`}
              >
                {summary}
              </span>
            </div>
          ),
          classNames: {
            header:
              'min-w-0 px-3! py-1.5! [&_.ant-collapse-expand-icon]:shrink-0! [&_.ant-collapse-header-text]:min-w-0!',
            body: 'px-3! pb-3! pt-0!',
          },
          children: (
            <div className="space-y-3">
              <DetailBlock
                title="输入参数"
                value={formatJson(block.input)}
                dark
              />
              {shouldShowResult && (
                <DetailBlock
                  title="执行结果"
                  value={resultText}
                />
              )}
              {logsText && (
                <DetailBlock
                  title="执行日志"
                  value={logsText}
                />
              )}
              {!shouldShowResult && !logsText && (
                <DetailBlock
                  title="执行结果"
                  value={resultText}
                />
              )}
            </div>
          ),
        },
      ]}
    />
  )
}

function ContentBlock({ block, streaming }: { block: ChatContentBlock; streaming?: boolean }) {
  if (block.type === 'text') {
    return (
      <AssistantMarkdownContent
        content={block.text}
        streaming={streaming}
      />
    )
  }

  return <ToolUseBlock block={block} />
}

export function AssistantMessageContent({ message }: { message: WorkbenchChatListItem }) {
  const blocks = parseBlocks(message)
  const visibleBlocks = blocks.filter((block) => block.type !== 'text' || block.text.trim())
  const metadata = parseChatMetadata(message.metadata)
  const errorDetail = metadata?.error?.detail
  const shouldShowPending =
    visibleBlocks.length === 0 && Boolean(message.pending || message.streaming)

  return (
    <div className="space-y-3">
      {shouldShowPending && <AssistantPendingContent />}

      {visibleBlocks.map((block, index) => (
        <ContentBlock
          // 后端 block 当前没有稳定 ID，流式投影块优先使用自身 key，否则按消息内顺序生成 key。
          key={block.key ?? `${message.key}-block-${index}`}
          block={block}
          streaming={Boolean(
            message.streaming && block.type === 'text' && index === visibleBlocks.length - 1,
          )}
        />
      ))}

      {errorDetail && (
        <Alert
          showIcon
          type="error"
          title="任务执行失败"
          description={errorDetail}
        />
      )}
    </div>
  )
}
