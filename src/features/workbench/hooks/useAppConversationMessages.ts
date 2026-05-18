import { listAppMessages } from '@/api/generated/endpoints/app'
import type { CursorResultAppChatMessageVO } from '@/api/generated/models'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'

import {
  flattenAppConversationMessagePages,
  getNextAppConversationCursor,
} from '../utils/appConversationMessages'

const APP_CONVERSATION_MESSAGES_PAGE_SIZE = 20

type AppConversationMessagesPageParam = string | null

const emptyMessagesPage: CursorResultAppChatMessageVO = {
  list: [],
  hasMore: false,
}

export function getAppConversationMessagesQueryKey(appId?: string) {
  return ['workbench', 'appConversationMessages', appId ?? null] as const
}

export function useAppConversationMessages<TError = { message?: string }>(appId?: string) {
  const query = useInfiniteQuery<
    CursorResultAppChatMessageVO,
    TError,
    InfiniteData<CursorResultAppChatMessageVO, AppConversationMessagesPageParam>,
    ReturnType<typeof getAppConversationMessagesQueryKey>,
    AppConversationMessagesPageParam
  >({
    queryKey: getAppConversationMessagesQueryKey(appId),
    enabled: Boolean(appId),
    initialPageParam: null,
    queryFn: async ({ pageParam, signal }) => {
      if (!appId) {
        return emptyMessagesPage
      }

      const response = await listAppMessages(
        appId,
        {
          request: {
            cursor: pageParam ?? undefined,
            pageSize: APP_CONVERSATION_MESSAGES_PAGE_SIZE,
          },
        },
        undefined,
        signal,
      )

      return response.data ?? emptyMessagesPage
    },
    getNextPageParam: getNextAppConversationCursor,
  })

  return {
    ...query,
    messages: flattenAppConversationMessagePages(query.data?.pages),
  }
}
