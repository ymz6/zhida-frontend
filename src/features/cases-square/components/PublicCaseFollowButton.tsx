import {
  invalidateGetFollowStatus,
  useFollowUser,
  useGetFollowStatus,
  useUnfollowUser,
} from '@/api/generated/endpoints/user-follow'
import type { FollowStatusVO } from '@/api/generated/models'
import { queryClient } from '@/libs/query-client'
import { useAuthSessionStore } from '@/stores/auth-session'
import { App, Button } from 'antd'
import { UserPlus, UserRoundMinus } from 'lucide-react'

import { getPublicCaseErrorMessage } from '../utils/publicCase'

export function PublicCaseFollowButton({
  userId,
  nickname,
}: {
  userId?: string
  nickname: string
}) {
  const { message, modal } = App.useApp()
  const isAuthenticated = useAuthSessionStore((state) => Boolean(state.accessToken))
  const currentUserId = useAuthSessionStore((state) => state.user?.id)
  const isSelf = Boolean(userId && currentUserId && userId === currentUserId)
  const followStatusQuery = useGetFollowStatus<FollowStatusVO | undefined, { message?: string }>(
    userId ?? '',
    {
      query: {
        enabled: Boolean(isAuthenticated && userId && !isSelf),
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const followMutation = useFollowUser<{ message?: string }>()
  const unfollowMutation = useUnfollowUser<{ message?: string }>()
  const isFollowing = Boolean(followStatusQuery.data?.isFollowing)
  const isPending = followMutation.isPending || unfollowMutation.isPending

  if (!userId || isSelf) {
    return null
  }

  const refreshStatus = async () => {
    await invalidateGetFollowStatus(queryClient, userId)
  }

  const handleFollow = async () => {
    if (!isAuthenticated) {
      message.warning('请先登录后关注作者')
      return
    }

    try {
      await followMutation.mutateAsync({ userId })
      message.success('已关注')
      await refreshStatus()
    } catch (error) {
      message.error(getPublicCaseErrorMessage(error, '关注失败'))
    }
  }

  const confirmUnfollow = () => {
    modal.confirm({
      centered: true,
      title: `取消关注「${nickname}」？`,
      content: '取消后，你可以稍后再次关注。',
      okText: '取消关注',
      cancelText: '取消',
      okButtonProps: { danger: true, className: 'rounded-full!' },
      cancelButtonProps: { className: 'rounded-full!' },
      onOk: async () => {
        try {
          await unfollowMutation.mutateAsync({ userId })
          message.success('已取消关注')
          await refreshStatus()
        } catch (error) {
          message.error(getPublicCaseErrorMessage(error, '取消关注失败'))
          throw error
        }
      },
    })
  }

  return isFollowing ? (
    <Button
      icon={<UserRoundMinus className="size-4" />}
      loading={isPending}
      onClick={confirmUnfollow}
      className="rounded-full!"
    >
      取消关注
    </Button>
  ) : (
    <Button
      type="primary"
      icon={<UserPlus className="size-4" />}
      loading={isPending || followStatusQuery.isLoading}
      onClick={() => void handleFollow()}
      className="rounded-full!"
    >
      关注
    </Button>
  )
}
