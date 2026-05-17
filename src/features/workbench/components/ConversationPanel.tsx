import type { AppChatMessageInfo } from '@/api/generated/models'
import { Bubble } from '@ant-design/x'
import { Empty, Skeleton } from 'antd'
import { Bot, Crosshair, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'

import {
  buildWorkbenchChatMessages,
  type WorkbenchChatMessageInfo,
} from '../utils/conversationTimeline'
import {
  parseVisualEditPrompt,
  type ParsedVisualEditPrompt,
  type VisualEditElement,
} from '../utils/visualEdit'
import { AssistantMessageContent } from './AssistantMessageContent'
import { ConversationComposer } from './ConversationComposer'

const roles = {
  user: {
    placement: 'end' as const,
    avatar: (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <UserRound
          className="size-4"
          aria-hidden="true"
        />
      </div>
    ),
  },
  assistant: {
    placement: 'start' as const,
    avatar: (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <Bot
          className="size-4"
          aria-hidden="true"
        />
      </div>
    ),
  },
}

const TOP_LOAD_THRESHOLD = 80
const BOTTOM_STICKY_THRESHOLD = 96
const bubbleListClassNames = {
  root: '!max-h-none',
  scroll: '!max-h-none !overflow-visible',
}

function isNearBottom(element: HTMLElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_STICKY_THRESHOLD
}

function scrollToBottom(element: HTMLElement) {
  element.scrollTop = element.scrollHeight
}

function VisualEditUserMessage({ parsedPrompt }: { parsedPrompt: ParsedVisualEditPrompt }) {
  const { element, requirement, sourceLocation } = parsedPrompt
  const lineText = sourceLocation.lineNumber ? ` (${sourceLocation.lineNumber})` : ''

  return (
    <div className="max-w-full space-y-3 text-left text-base leading-7 text-slate-950">
      <div>请对以下选中元素进行修改：</div>
      <div>
        <span>修改需求：</span>
        <span>{requirement || '未填写具体修改需求'}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-400">
        <Crosshair
          className="size-4 shrink-0 text-slate-500"
          aria-hidden="true"
        />
        <span className="shrink-0 font-mono text-slate-700">{`<${element.tag}>`}</span>
        <span className="min-w-0 truncate font-mono">
          {sourceLocation.filePath}
          {lineText}
        </span>
      </div>
    </div>
  )
}

function renderUserMessage(content: string) {
  const parsedPrompt = parseVisualEditPrompt(content)

  if (parsedPrompt) {
    // 协议内容继续完整发送给 Agent，聊天区只展示用户友好的摘要。
    return <VisualEditUserMessage parsedPrompt={parsedPrompt} />
  }

  return content
}

export function ConversationPanel({
  persistedMessages,
  streamMessages,
  isLoadingMessages,
  hasMoreMessages,
  isLoadingMoreMessages,
  canCode,
  isSubmitting,
  previewUrl,
  isVisualEditMode,
  selectedVisualEditElement,
  onLoadMoreMessages,
  onVisualEditModeChange,
  onSubmitMessage,
}: {
  persistedMessages: AppChatMessageInfo[]
  streamMessages: WorkbenchChatMessageInfo[]
  isLoadingMessages?: boolean
  hasMoreMessages?: boolean
  isLoadingMoreMessages?: boolean
  canCode?: boolean
  isSubmitting?: boolean
  previewUrl?: string
  isVisualEditMode?: boolean
  selectedVisualEditElement?: VisualEditElement | null
  onLoadMoreMessages?: () => Promise<void>
  onVisualEditModeChange?: (enabled: boolean) => void
  onSubmitMessage: (prompt: string) => boolean
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const scrollContentRef = useRef<HTMLDivElement | null>(null)
  const restoreScrollRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null)
  const didInitialScrollRef = useRef(false)
  // 记录新内容到来时是否需要继续黏在最新消息处。
  const shouldStickToBottomRef = useRef(true)
  // 提交成功后，即使用户正在查看历史消息，也需要跳到底部。
  const shouldForceScrollBottomRef = useRef(false)
  const isRequestingMoreRef = useRef(false)

  const items = useMemo(() => {
    const chatMessages = buildWorkbenchChatMessages({
      persistedMessages,
      streamMessages,
    })
    const messageItems: Array<{ key: string; role: string; content: ReactNode }> = []

    chatMessages.forEach((chatMessage) => {
      if (chatMessage.role === 'USER') {
        messageItems.push({
          key: chatMessage.key,
          role: 'user',
          content: renderUserMessage(chatMessage.content),
        })
        return
      }

      messageItems.push({
        key: chatMessage.key,
        role: 'assistant',
        content: <AssistantMessageContent message={chatMessage} />,
      })
    })

    return messageItems
  }, [persistedMessages, streamMessages])

  const loadMoreMessages = useCallback(async () => {
    const scrollContainer = scrollContainerRef.current

    if (
      !scrollContainer ||
      !hasMoreMessages ||
      isLoadingMoreMessages ||
      isRequestingMoreRef.current ||
      !onLoadMoreMessages
    ) {
      return
    }

    restoreScrollRef.current = {
      scrollHeight: scrollContainer.scrollHeight,
      scrollTop: scrollContainer.scrollTop,
    }
    isRequestingMoreRef.current = true

    try {
      await onLoadMoreMessages()
    } finally {
      isRequestingMoreRef.current = false
    }
  }, [hasMoreMessages, isLoadingMoreMessages, onLoadMoreMessages])

  const handleConversationScroll = useCallback(() => {
    const scrollContainer = scrollContainerRef.current

    if (!scrollContainer) {
      return
    }

    shouldStickToBottomRef.current = isNearBottom(scrollContainer)

    if (scrollContainer.scrollTop <= TOP_LOAD_THRESHOLD) {
      void loadMoreMessages()
    }
  }, [loadMoreMessages])

  const syncConversationScroll = useCallback(() => {
    const scrollContainer = scrollContainerRef.current

    if (!scrollContainer || isLoadingMessages) {
      return
    }

    const restoreScroll = restoreScrollRef.current

    if (restoreScroll) {
      // 历史消息会插入到顶部，用高度差补偿当前视口，避免内容跳动。
      const heightDelta = scrollContainer.scrollHeight - restoreScroll.scrollHeight

      scrollContainer.scrollTop = restoreScroll.scrollTop + heightDelta
      restoreScrollRef.current = null
      shouldStickToBottomRef.current = isNearBottom(scrollContainer)
      return
    }

    // 首次渲染历史消息时，默认从最新消息开始看。
    if (!didInitialScrollRef.current && items.length > 0) {
      scrollToBottom(scrollContainer)
      didInitialScrollRef.current = true
      shouldStickToBottomRef.current = true
      shouldForceScrollBottomRef.current = false
      return
    }

    if (shouldForceScrollBottomRef.current || shouldStickToBottomRef.current) {
      scrollToBottom(scrollContainer)
      shouldForceScrollBottomRef.current = false
      shouldStickToBottomRef.current = true
    }
  }, [isLoadingMessages, items.length])

  useLayoutEffect(() => {
    syncConversationScroll()
  }, [items, syncConversationScroll])

  useLayoutEffect(() => {
    const scrollContent = scrollContentRef.current

    if (!scrollContent || isLoadingMessages || typeof ResizeObserver === 'undefined') {
      return
    }

    let frameId: number | undefined
    const resizeObserver = new ResizeObserver(() => {
      // 流式 Markdown 可能只改变 DOM 高度，不改变消息数量。
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = undefined
        syncConversationScroll()
      })
    })

    resizeObserver.observe(scrollContent)

    return () => {
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId)
      }

      resizeObserver.disconnect()
    }
  }, [isLoadingMessages, syncConversationScroll])

  const handleSubmitMessage = useCallback(
    (prompt: string) => {
      const didSubmit = onSubmitMessage(prompt)

      if (didSubmit) {
        const scrollContainer = scrollContainerRef.current

        shouldForceScrollBottomRef.current = true
        shouldStickToBottomRef.current = true

        if (scrollContainer) {
          scrollToBottom(scrollContainer)
        }
      }

      return didSubmit
    },
    [onSubmitMessage],
  )

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <div
        ref={scrollContainerRef}
        onScroll={handleConversationScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4"
      >
        <div ref={scrollContentRef}>
          {isLoadingMessages ? (
            <Skeleton
              active
              avatar
              paragraph={{ rows: 4 }}
            />
          ) : items.length > 0 ? (
            <Bubble.List
              autoScroll={false}
              classNames={bubbleListClassNames}
              items={items}
              role={roles}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无对话消息"
              className="pt-20"
            />
          )}
        </div>
      </div>

      <ConversationComposer
        canCode={canCode}
        isSubmitting={isSubmitting}
        previewUrl={previewUrl}
        isVisualEditMode={isVisualEditMode}
        selectedVisualEditElement={selectedVisualEditElement}
        onVisualEditModeChange={onVisualEditModeChange}
        onSubmitMessage={handleSubmitMessage}
      />
    </section>
  )
}
