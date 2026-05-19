import type { AppVO } from '@/api/generated/models'
import { AppAssistantMessageContent } from '@/features/workbench/components/AppAssistantMessageContent'
import { AppConversationAvatar } from '@/features/workbench/components/AppConversationAvatar'
import { getAppConversationBubbleRole } from '@/features/workbench/utils/appConversationMessages'
import { Bubble } from '@ant-design/x'
import { Alert, Button, Empty, Spin } from 'antd'

import { useCaseAppMessages } from '../hooks/useCaseAppMessages'
import { getCaseErrorMessage } from '../utils/caseManagement'

const caseMessageBubbleRoles = {
  assistant: {
    placement: 'start' as const,
    avatar: <AppConversationAvatar role="assistant" />,
  },
  user: {
    placement: 'end' as const,
    avatar: <AppConversationAvatar role="user" />,
  },
}

const bubbleListClassNames = {
  root: '!max-h-none',
  scroll: '!max-h-none !overflow-visible',
}

export function CaseAppMessagesPanel({
  app,
  variant = 'card',
}: {
  app: AppVO
  variant?: 'card' | 'drawer'
}) {
  const messagesQuery = useCaseAppMessages(app.id)
  const contentClassName =
    variant === 'drawer'
      ? 'min-h-96 bg-white'
      : 'min-h-96 rounded-xl border border-slate-200 bg-white p-4'
  const conversationItems = messagesQuery.messages.map((message, index) => {
    const role = getAppConversationBubbleRole(message.role)
    const content = message.content?.trim() || '（空消息）'

    return {
      key: message.id || `case-message-${index}`,
      role,
      content:
        role === 'assistant' ? (
          <AppAssistantMessageContent content={content} />
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-6">{content}</div>
        ),
    }
  })

  return (
    <section className="space-y-4">
      <div className={contentClassName}>
        {messagesQuery.hasNextPage ? (
          <div className="mb-4 flex justify-start">
            <Button
              size="small"
              loading={messagesQuery.isFetchingNextPage}
              onClick={() => void messagesQuery.fetchNextPage()}
            >
              加载更早
            </Button>
          </div>
        ) : null}

        {messagesQuery.isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Spin />
          </div>
        ) : messagesQuery.isError && !conversationItems.length ? (
          <Alert
            type="error"
            showIcon
            title="消息加载失败"
            description={getCaseErrorMessage(messagesQuery.error, '请稍后重试。')}
            action={
              <Button
                size="small"
                onClick={() => void messagesQuery.refetch()}
              >
                重试
              </Button>
            }
          />
        ) : !conversationItems.length ? (
          <div className="flex h-48 items-center justify-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无生成消息"
            />
          </div>
        ) : (
          <>
            {messagesQuery.isError ? (
              <Alert
                type="error"
                showIcon
                className="mb-3"
                title="较早消息加载失败"
                description={getCaseErrorMessage(messagesQuery.error, '请稍后重试。')}
              />
            ) : null}
            <Bubble.List
              autoScroll={false}
              classNames={bubbleListClassNames}
              items={conversationItems}
              role={caseMessageBubbleRoles}
            />
          </>
        )}
      </div>
    </section>
  )
}
