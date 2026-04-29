import { getListMyAppsQueryKey, listMyApps } from '@/api/generated/endpoints/app'
import {
  ListMyAppsRequestSortOrder,
  type AppSummary,
  type ListMyAppsRequest,
} from '@/api/generated/models'
import { AppCard, type AppCardData } from '@/components/AppCard'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Button, Empty, Skeleton } from 'antd'
import { ChevronDown, Palette, RotateCcw } from 'lucide-react'

const MY_APPS_PAGE_SIZE = 3

const DEFAULT_MY_APPS_REQUEST: ListMyAppsRequest = {
  pageSize: MY_APPS_PAGE_SIZE,
  sortField: 'createdAt',
  sortOrder: ListMyAppsRequestSortOrder.DESC,
}

function formatCreatedAt(createdAt?: string) {
  return createdAt?.split(/[T ]/)[0] || '-'
}

function mapAppSummaryToCardData(app: AppSummary): AppCardData | undefined {
  if (!app.id) {
    return undefined
  }

  return {
    id: app.id,
    name: app.name?.trim() || '未命名应用',
    coverUrl: app.coverUrl,
    authorName: app.author?.nickname?.trim() || '未知用户',
    authorAvatarUrl: app.author?.avatar,
    createdAt: formatCreatedAt(app.createdAt),
  }
}

function MyAppCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
      <div className="aspect-video bg-slate-100" />
      <div className="min-h-24 px-4 py-3">
        <Skeleton
          active
          avatar={{ size: 34 }}
          title={{ width: '72%' }}
          paragraph={{ rows: 1, width: '42%' }}
        />
      </div>
    </div>
  )
}

export function MyAppsSection() {
  const navigate = useNavigate()
  const myAppsQuery = useInfiniteQuery({
    queryKey: [...getListMyAppsQueryKey({ request: DEFAULT_MY_APPS_REQUEST }), 'infinite'] as const,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      const request: ListMyAppsRequest = {
        ...DEFAULT_MY_APPS_REQUEST,
        pageNum: typeof pageParam === 'number' ? pageParam : 1,
      }

      return listMyApps({ request }, { params: request }, signal)
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.data?.hasNext) {
        return undefined
      }

      return (lastPage.data.pageNum ?? allPages.length) + 1
    },
    retry: false,
  })
  const apps =
    myAppsQuery.data?.pages.flatMap((page) =>
      (page.data?.list ?? []).flatMap((app) => {
        const cardData = mapAppSummaryToCardData(app)

        return cardData ? [cardData] : []
      }),
    ) ?? []
  const hasApps = apps.length > 0
  const isInitialLoading = myAppsQuery.isPending
  const isInitialError = myAppsQuery.isError && !hasApps
  const errorMessage =
    (myAppsQuery.error as { message?: string } | null)?.message ?? '我的作品加载失败，请稍后重试'

  const handleOpenApp = (app: AppCardData) => {
    void navigate({
      to: '/workbench/$appId',
      params: { appId: app.id },
    })
  }

  const handleLoadMore = async () => {
    if (!myAppsQuery.hasNextPage || myAppsQuery.isFetchingNextPage) {
      return
    }

    await myAppsQuery.fetchNextPage()
  }

  return (
    <section className="relative z-10 mx-auto mt-20 max-w-7xl">
      <h2 className="flex items-center text-2xl font-bold text-slate-950">
        <Palette className="mr-3 size-6 text-sky-500" />
        我的作品
      </h2>

      {isInitialLoading ? (
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: MY_APPS_PAGE_SIZE }).map((_, index) => (
            <MyAppCardSkeleton key={index} />
          ))}
        </div>
      ) : isInitialError ? (
        <Alert
          showIcon
          type="error"
          className="mt-5 rounded-xl!"
          title={errorMessage}
          action={
            <Button
              size="small"
              icon={<RotateCcw className="size-4" />}
              onClick={() => void myAppsQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      ) : hasApps ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onClick={handleOpenApp}
              />
            ))}
          </div>

          {myAppsQuery.isError && (
            <Alert
              showIcon
              type="error"
              className="mt-5 rounded-xl!"
              title={errorMessage}
            />
          )}

          {myAppsQuery.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                icon={<ChevronDown className="size-4" />}
                loading={myAppsQuery.isFetchingNextPage}
                disabled={myAppsQuery.isFetchingNextPage}
                onClick={() => void handleLoadMore()}
                className="h-10 rounded-full px-5!"
              >
                查看更多
              </Button>
            </div>
          )}
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="还没有作品"
          className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white/70 py-12"
        />
      )}
    </section>
  )
}
