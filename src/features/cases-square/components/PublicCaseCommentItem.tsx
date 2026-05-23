import { useDeleteComment, useToggleLike } from '@/api/generated/endpoints/comment'
import type { CommentVO } from '@/api/generated/models'
import { App, Avatar, Button } from 'antd'
import { Heart, MessageCircle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  canDeletePublicCaseComment,
  formatPublicCaseCount,
  formatPublicCaseDateTime,
  getPublicCaseErrorMessage,
} from '../utils/publicCase'

type PublicCaseCommentItemProps = {
  comment: CommentVO
  currentUserId?: string
  compact?: boolean
  onReply: (comment: CommentVO) => void
  onDeleted: () => void
}

function getCommentAuthorName(comment: CommentVO) {
  return comment.author?.nickname?.trim() || '未知用户'
}

function getCommentAuthorInitial(comment: CommentVO) {
  return getCommentAuthorName(comment).slice(0, 1).toUpperCase()
}

export function PublicCaseCommentItem({
  comment,
  currentUserId,
  compact = false,
  onReply,
  onDeleted,
}: PublicCaseCommentItemProps) {
  const { message, modal } = App.useApp()
  const toggleLikeMutation = useToggleLike<{ message?: string }>()
  const deleteCommentMutation = useDeleteComment<{ message?: string }>()
  const [liked, setLiked] = useState(Boolean(comment.liked))
  const [likeCount, setLikeCount] = useState(formatPublicCaseCount(comment.likeCount))
  const canDelete = canDeletePublicCaseComment(comment, currentUserId)

  useEffect(() => {
    setLiked(Boolean(comment.liked))
    setLikeCount(formatPublicCaseCount(comment.likeCount))
  }, [comment.id, comment.liked, comment.likeCount])

  const handleLike = async () => {
    if (!comment.id) {
      return
    }

    try {
      const response = await toggleLikeMutation.mutateAsync({ commentId: comment.id })
      setLiked(Boolean(response.data?.liked))
      setLikeCount(formatPublicCaseCount(response.data?.likeCount))
    } catch (error) {
      message.error(getPublicCaseErrorMessage(error, '点赞失败'))
    }
  }

  const confirmDelete = () => {
    if (!comment.id) {
      return
    }

    modal.confirm({
      centered: true,
      title: '删除这条评论？',
      content: '删除后该评论将不可恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true, className: 'rounded-full!' },
      cancelButtonProps: { className: 'rounded-full!' },
      onOk: async () => {
        try {
          await deleteCommentMutation.mutateAsync({ commentId: comment.id! })
          message.success('评论已删除')
          onDeleted()
        } catch (error) {
          message.error(getPublicCaseErrorMessage(error, '删除评论失败'))
          throw error
        }
      },
    })
  }

  return (
    <article className={`flex gap-3 ${compact ? 'rounded-lg bg-slate-50 p-3' : ''}`}>
      <Avatar
        size={compact ? 28 : 34}
        src={comment.author?.avatar}
        className="shrink-0 bg-blue-50 text-blue-600"
      >
        {getCommentAuthorInitial(comment)}
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-950">
            {getCommentAuthorName(comment)}
          </span>
          <span className="shrink-0 text-xs text-slate-400">
            {formatPublicCaseDateTime(comment.createdAt)}
          </span>
        </div>

        <p className="mt-1 mb-0 break-words text-sm leading-6 text-slate-700">
          {comment.replyToUser?.nickname ? (
            <span className="text-slate-500">回复 @{comment.replyToUser.nickname}：</span>
          ) : null}
          <span>{comment.content}</span>
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Button
            type="text"
            size="small"
            icon={<Heart className={liked ? 'size-4 fill-rose-500 text-rose-500' : 'size-4'} />}
            loading={toggleLikeMutation.isPending}
            disabled={!comment.id}
            onClick={() => void handleLike()}
            className={liked ? 'rounded-full! text-rose-500!' : 'rounded-full! text-slate-500!'}
          >
            {likeCount}
          </Button>
          <Button
            type="text"
            size="small"
            icon={<MessageCircle className="size-4" />}
            disabled={!comment.id}
            onClick={() => onReply(comment)}
            className="rounded-full! text-slate-500!"
          >
            回复
          </Button>
          {canDelete ? (
            <Button
              type="text"
              size="small"
              danger
              icon={<Trash2 className="size-4" />}
              loading={deleteCommentMutation.isPending}
              onClick={confirmDelete}
              className="rounded-full!"
            >
              删除
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
