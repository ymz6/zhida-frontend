import {
  invalidateGetFavoriteStatus,
  useAddFavoriteApp,
  useGetFavoriteStatus,
  useListFavorites,
  useRemoveFavoriteApp,
} from '@/api/generated/endpoints/favorite'
import type { FavoriteStatusVO, FavoriteVO } from '@/api/generated/models'
import { queryClient } from '@/libs/query-client'
import { useAuthSessionStore } from '@/stores/auth-session'
import { useNavigate } from '@tanstack/react-router'
import { App, Button, Checkbox, Empty, Popover, Spin } from 'antd'
import { Heart } from 'lucide-react'

import { getPublicCaseErrorMessage } from '../utils/publicCase'

function getFavoriteName(favorite: FavoriteVO) {
  return favorite.name?.trim() || '未命名收藏夹'
}

export function PublicCaseFavoritePopover({ appId }: { appId?: string }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const isAuthenticated = useAuthSessionStore((state) => Boolean(state.accessToken))
  const favoritesQuery = useListFavorites<FavoriteVO[] | undefined, { message?: string }>({
    query: {
      enabled: isAuthenticated,
      retry: false,
      select: (response) => response.data,
    },
  })
  const statusQuery = useGetFavoriteStatus<FavoriteStatusVO | undefined, { message?: string }>(
    appId ?? '',
    {
      query: {
        enabled: Boolean(isAuthenticated && appId),
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const addFavoriteMutation = useAddFavoriteApp<{ message?: string }>()
  const removeFavoriteMutation = useRemoveFavoriteApp<{ message?: string }>()
  const favoritedIds = new Set((statusQuery.data?.favorites ?? []).map((favorite) => favorite.id))
  const isFavorited = Boolean(statusQuery.data?.isFavorited)
  const isMutating = addFavoriteMutation.isPending || removeFavoriteMutation.isPending

  const refreshStatus = async () => {
    if (appId) {
      await invalidateGetFavoriteStatus(queryClient, appId)
    }
  }

  const handleToggleFavorite = async (favorite: FavoriteVO, checked: boolean) => {
    if (!appId || !favorite.id) {
      return
    }

    try {
      if (checked) {
        await addFavoriteMutation.mutateAsync({ appId, data: { favoriteId: favorite.id } })
        message.success('已收藏应用')
      } else {
        await removeFavoriteMutation.mutateAsync({ favoriteId: favorite.id, appId })
        message.success('已移出收藏夹')
      }

      await refreshStatus()
    } catch (error) {
      message.error(getPublicCaseErrorMessage(error, checked ? '收藏失败' : '移出收藏夹失败'))
    }
  }

  const content = !isAuthenticated ? (
    <div className="w-56 text-sm text-slate-500">请先登录后收藏应用</div>
  ) : favoritesQuery.isLoading || statusQuery.isLoading ? (
    <div className="flex w-56 justify-center py-6">
      <Spin />
    </div>
  ) : favoritesQuery.isError || statusQuery.isError ? (
    <div className="w-56 space-y-3">
      <p className="m-0 text-sm text-red-500">收藏夹加载失败</p>
      <Button
        size="small"
        className="rounded-full!"
        onClick={() => void Promise.all([favoritesQuery.refetch(), statusQuery.refetch()])}
      >
        重试
      </Button>
    </div>
  ) : (favoritesQuery.data ?? []).length === 0 ? (
    <div className="w-56">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无收藏夹"
      />
    </div>
  ) : (
    <div className="w-64">
      <div className="mb-2 text-sm font-semibold text-slate-950">收藏到收藏夹</div>
      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {(favoritesQuery.data ?? []).map((favorite) => (
          <Checkbox
            key={favorite.id ?? getFavoriteName(favorite)}
            checked={Boolean(favorite.id && favoritedIds.has(favorite.id))}
            disabled={isMutating || !favorite.id}
            onChange={(event) => void handleToggleFavorite(favorite, event.target.checked)}
          >
            <span className="text-sm text-slate-700">{getFavoriteName(favorite)}</span>
          </Checkbox>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void navigate({ to: '/profile' })}
        className="mt-3 rounded-full px-2 py-1 text-sm font-medium text-sky-600 hover:bg-sky-50 hover:text-sky-700"
      >
        管理收藏夹
      </button>
    </div>
  )

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={content}
    >
      <Button
        type={isFavorited ? 'primary' : 'default'}
        icon={<Heart className={isFavorited ? 'size-4 fill-current' : 'size-4'} />}
        disabled={!appId}
        loading={isMutating}
        className="rounded-full!"
      >
        {isFavorited ? '已收藏' : '收藏应用'}
      </Button>
    </Popover>
  )
}
