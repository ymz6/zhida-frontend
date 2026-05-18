import type { AppChatMessageVO, CursorResultAppChatMessageVO } from '@/api/generated/models'

export type AppConversationBubbleRole = 'assistant' | 'user'

export type AppConversationMessageStatus = 'generating' | 'failed' | 'completed'

export type AppConversationDisplayMessage = AppChatMessageVO & {
  id: string
  isLocal?: boolean
  status?: AppConversationMessageStatus
}

export function getAppConversationBubbleRole(role?: string): AppConversationBubbleRole {
  return role?.toLowerCase() === 'user' ? 'user' : 'assistant'
}

export function createLocalAppConversationMessage({
  id,
  role,
  content = '',
  status = 'completed',
}: {
  id: string
  role: AppConversationBubbleRole
  content?: string
  status?: AppConversationMessageStatus
}): AppConversationDisplayMessage {
  return {
    id,
    role,
    content,
    status,
    isLocal: true,
    createdAt: new Date().toISOString(),
  }
}

export function isAppChatStreamErrorContent(content: string) {
  return content.trim().startsWith('【错误】')
}

export function shouldStreamAppConversationMarkdown(
  message: Pick<AppConversationDisplayMessage, 'role' | 'status'>,
) {
  return (
    getAppConversationBubbleRole(message.role) === 'assistant' && message.status === 'generating'
  )
}

export function getNextAppConversationCursor(page: CursorResultAppChatMessageVO): string | null {
  const nextCursor = page.nextCursor?.trim()

  if (!page.hasMore || !nextCursor) {
    return null
  }

  return nextCursor
}

export function flattenAppConversationMessagePages(
  pages?: CursorResultAppChatMessageVO[],
): AppChatMessageVO[] {
  if (!pages?.length) {
    return []
  }

  // 后端首屏返回最新一页，继续翻页返回更早记录；展示时需要把更早页排在前面。
  return [...pages].reverse().flatMap((page) => page.list ?? [])
}
