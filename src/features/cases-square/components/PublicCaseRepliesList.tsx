import { useListReplies } from '@/api/generated/endpoints/comment'
import type { CommentVO, PageResultCommentVO } from '@/api/generated/models'
import { Alert, Button, Spin } from 'antd'
import { useEffect, useState } from 'react'

import { getPublicCaseErrorMessage } from '../utils/publicCase'
import { PublicCaseCommentItem } from './PublicCaseCommentItem'

const REPLIES_PAGE_SIZE = 5

type PublicCaseRepliesListProps = {
  rootCommentId: string
  currentUserId?: string
  refreshVersion: number
  onReply: (comment: CommentVO) => void
  onReplyChanged: () => void
}

export function PublicCaseRepliesList({
  rootCommentId,
  currentUserId,
  refreshVersion,
  onReply,
  onReplyChanged,
}: PublicCaseRepliesListProps) {
  const [pageNum, setPageNum] = useState(1)
  const [replies, setReplies] = useState<CommentVO[]>([])
  const repliesQuery = useListReplies<PageResultCommentVO | undefined, { message?: string }>(
    rootCommentId,
    { request: { pageNum, pageSize: REPLIES_PAGE_SIZE } },
    {
      query: {
        retry: false,
        select: (response) => response.data,
      },
    },
  )

  useEffect(() => {
    const nextReplies = repliesQuery.data?.list ?? []

    setReplies((currentReplies) => {
      if (pageNum === 1) {
        return nextReplies
      }

      const existingIds = new Set(currentReplies.map((reply) => reply.id))
      const appendedReplies = nextReplies.filter((reply) => !reply.id || !existingIds.has(reply.id))
      return [...currentReplies, ...appendedReplies]
    })
  }, [pageNum, repliesQuery.data?.list])

  useEffect(() => {
    setReplies([])
    setPageNum(1)
    void repliesQuery.refetch()
    // refreshVersion is the external signal from successful reply/deletion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion])

  const resetReplies = async () => {
    setReplies([])
    if (pageNum === 1) {
      await repliesQuery.refetch()
      return
    }

    setPageNum(1)
  }

  if (repliesQuery.isError) {
    return (
      <Alert
        showIcon
        type="error"
        message="回复加载失败"
        description={getPublicCaseErrorMessage(repliesQuery.error, '请稍后重试')}
        action={
          <Button
            className="rounded-full!"
            onClick={() => void repliesQuery.refetch()}
          >
            重试
          </Button>
        }
        className="mt-3 rounded-lg"
      />
    )
  }

  if (repliesQuery.isLoading && replies.length === 0) {
    return (
      <div className="mt-3 flex justify-center rounded-lg bg-slate-50 py-4">
        <Spin />
      </div>
    )
  }

  if (replies.length === 0) {
    return null
  }

  return (
    <div className="mt-3 space-y-2">
      {replies.map((reply, index) => (
        <PublicCaseCommentItem
          key={reply.id ?? `${rootCommentId}-reply-${index}`}
          comment={reply}
          currentUserId={currentUserId}
          compact
          onReply={onReply}
          onDeleted={() => {
            void resetReplies()
            onReplyChanged()
          }}
        />
      ))}
      {repliesQuery.data?.hasNext ? (
        <Button
          type="link"
          size="small"
          loading={repliesQuery.isFetching}
          onClick={() => setPageNum((value) => value + 1)}
          className="rounded-full! px-0"
        >
          加载更多回复
        </Button>
      ) : null}
    </div>
  )
}
