import { listAppMessages } from '@/api/generated/endpoints/app'
import type { CursorResultAppChatMessageVO } from '@/api/generated/models'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'

import { CASE_MESSAGES_PAGE_SIZE } from '../utils/caseManagement'

type CaseAppMessagesPageParam = string | null

const emptyMessagesPage: CursorResultAppChatMessageVO = {
  list: [],
  hasMore: false,
}

export function getCaseAppMessagesQueryKey(appId?: string) {
  return ['case-management', 'appMessages', appId ?? null] as const
}

function getNextCaseAppMessagesCursor(page: CursorResultAppChatMessageVO): string | null {
  const nextCursor = page.nextCursor?.trim()

  if (!page.hasMore || !nextCursor) {
    return null
  }

  return nextCursor
}

function flattenCaseAppMessagePages(pages?: CursorResultAppChatMessageVO[]) {
  if (!pages?.length) {
    return []
  }

  // 后端首屏返回最新一页，继续翻页返回更早记录；展示时把更早页排在前面。
  return [...pages].reverse().flatMap((page) => page.list ?? [])
}

export function useCaseAppMessages<TError = { message?: string }>(appId?: string) {
  const query = useInfiniteQuery<
    CursorResultAppChatMessageVO,
    TError,
    InfiniteData<CursorResultAppChatMessageVO, CaseAppMessagesPageParam>,
    ReturnType<typeof getCaseAppMessagesQueryKey>,
    CaseAppMessagesPageParam
  >({
    queryKey: getCaseAppMessagesQueryKey(appId),
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
            pageSize: CASE_MESSAGES_PAGE_SIZE,
          },
        },
        undefined,
        signal,
      )

      return response.data ?? emptyMessagesPage
    },
    getNextPageParam: getNextCaseAppMessagesCursor,
  })

  return {
    ...query,
    messages: flattenCaseAppMessagePages(query.data?.pages),
  }
}
