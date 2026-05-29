import {
  invalidateListFavoriteApps,
  invalidateListFavorites,
  useCreateFavorite,
  useDeleteFavorite,
  useListFavoriteApps,
  useListFavorites,
  useMoveFavoriteApp,
  useRemoveFavoriteApp,
  useSortFavorites,
  useUpdateFavorite,
} from '@/api/generated/endpoints/favorite'
import type {
  AppVO,
  FavoriteVO,
  ListFavoriteAppsRequest,
  PageResultAppVO,
} from '@/api/generated/models'
import { queryClient } from '@/libs/query-client'
import { keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Alert,
  App,
  Button,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Tag,
  Tooltip,
} from 'antd'
import {
  FolderPlus,
  GripVertical,
  MoreVertical,
  MoveRight,
  PencilLine,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import type { DragEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { PublicCaseCard } from '@/features/cases-square/components/PublicCaseCard'
import type { PublicCaseCardData } from '@/features/cases-square/components/PublicCaseCard'

import { formatProfileDateTime, getAppDisplayName, getErrorMessage } from '../utils/profile'

const APP_PAGE_SIZE = 6

interface FavoriteFormValues {
  name: string
  description?: string
}

interface MoveFavoriteFormValues {
  targetFavoriteId: string
}

function getFavoriteName(favorite: FavoriteVO) {
  return favorite.name?.trim() || '未命名收藏夹'
}

function getFavoriteSortOrder(favorite: FavoriteVO) {
  const sortOrder = Number(favorite.sortOrder ?? Number.MAX_SAFE_INTEGER)

  return Number.isFinite(sortOrder) ? sortOrder : Number.MAX_SAFE_INTEGER
}

function keepDefaultFavoriteFirst(favorites: FavoriteVO[]) {
  const defaultFavorite = favorites.find((favorite) => favorite.isDefault)
  const otherFavorites = favorites.filter((favorite) => !favorite.isDefault)

  return defaultFavorite ? [defaultFavorite, ...otherFavorites] : otherFavorites
}

function normalizeFavorites(favorites: FavoriteVO[]) {
  const sortedFavorites = [...favorites].sort((leftFavorite, rightFavorite) => {
    if (leftFavorite.isDefault && !rightFavorite.isDefault) {
      return -1
    }

    if (!leftFavorite.isDefault && rightFavorite.isDefault) {
      return 1
    }

    return getFavoriteSortOrder(leftFavorite) - getFavoriteSortOrder(rightFavorite)
  })

  return keepDefaultFavoriteFirst(sortedFavorites)
}

function areFavoriteOrdersEqual(leftFavorites: FavoriteVO[], rightFavorites: FavoriteVO[]) {
  if (leftFavorites.length !== rightFavorites.length) {
    return false
  }

  return leftFavorites.every((favorite, index) => favorite.id === rightFavorites[index]?.id)
}

function moveFavoriteAroundTarget(
  favorites: FavoriteVO[],
  draggingFavoriteId: string,
  targetFavoriteId: string,
) {
  const sourceIndex = favorites.findIndex((favorite) => favorite.id === draggingFavoriteId)
  const targetIndex = favorites.findIndex((favorite) => favorite.id === targetFavoriteId)
  const draggingFavorite = favorites[sourceIndex]

  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex === targetIndex ||
    draggingFavorite?.isDefault
  ) {
    return favorites
  }

  const nextFavorites = [...favorites]
  const [movedFavorite] = nextFavorites.splice(sourceIndex, 1)
  const nextTargetIndex = nextFavorites.findIndex((favorite) => favorite.id === targetFavoriteId)
  const insertIndex = sourceIndex < targetIndex ? nextTargetIndex + 1 : nextTargetIndex
  nextFavorites.splice(Math.max(1, insertIndex), 0, movedFavorite)

  // 默认收藏夹由后端语义决定，前端排序时始终把它钉在第一位。
  return keepDefaultFavoriteFirst(nextFavorites)
}

function buildSortFavoritesPayload(favorites: FavoriteVO[]) {
  return favorites
    .filter((favorite): favorite is FavoriteVO & { id: string } => Boolean(favorite.id))
    .map((favorite, index) => ({
      favoriteId: favorite.id,
      sortOrder: index,
    }))
}

function mapAppToPublicCaseData(app: AppVO): PublicCaseCardData {
  return {
    id: app.id ?? getAppDisplayName(app),
    title: getAppDisplayName(app),
    authorName: app.author?.nickname?.trim() || '未知作者',
    authorAvatar: app.author?.avatar,
    createdAt: formatProfileDateTime(app.publishedAt ?? app.createdAt),
    isFeatured: Boolean(app.featured),
    coverUrl: app.coverUrl,
  }
}

export function ProfileFavoritesSection() {
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const [favoriteForm] = Form.useForm<FavoriteFormValues>()
  const [moveForm] = Form.useForm<MoveFavoriteFormValues>()
  const [editingFavorite, setEditingFavorite] = useState<FavoriteVO | null>(null)
  const [movingApp, setMovingApp] = useState<AppVO | null>(null)
  const [isFavoriteModalOpen, setIsFavoriteModalOpen] = useState(false)
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string>()
  const [orderedFavorites, setOrderedFavorites] = useState<FavoriteVO[]>([])
  const [draggingFavoriteId, setDraggingFavoriteId] = useState<string | null>(null)
  const [dragSnapshot, setDragSnapshot] = useState<FavoriteVO[] | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [keywordInput, setKeywordInput] = useState('')
  const [appKeyword, setAppKeyword] = useState('')
  const orderedFavoritesRef = useRef<FavoriteVO[]>([])

  const favoritesQuery = useListFavorites<FavoriteVO[] | undefined, { message?: string }>({
    query: {
      retry: false,
      select: (response) => response.data,
    },
  })
  const createFavoriteMutation = useCreateFavorite<{ message?: string }>()
  const updateFavoriteMutation = useUpdateFavorite<{ message?: string }>()
  const deleteFavoriteMutation = useDeleteFavorite<{ message?: string }>()
  const sortFavoritesMutation = useSortFavorites<{ message?: string }>()
  const moveFavoriteAppMutation = useMoveFavoriteApp<{ message?: string }>()
  const removeFavoriteAppMutation = useRemoveFavoriteApp<{ message?: string }>()
  const selectedFavorite = useMemo(
    () =>
      orderedFavorites.find((favorite) => favorite.id === selectedFavoriteId) ??
      orderedFavorites[0],
    [orderedFavorites, selectedFavoriteId],
  )
  const selectedFavoriteAppsRequest: ListFavoriteAppsRequest = {
    pageNum: currentPage,
    pageSize: APP_PAGE_SIZE,
    keyword: appKeyword || undefined,
  }
  const favoriteAppsQueryParams = {
    request: selectedFavoriteAppsRequest,
  }
  const favoriteAppsQuery = useListFavoriteApps<PageResultAppVO | undefined, { message?: string }>(
    selectedFavorite?.id ?? '',
    favoriteAppsQueryParams,
    {
      request: {
        params: selectedFavoriteAppsRequest,
      },
      query: {
        enabled: Boolean(selectedFavorite?.id),
        placeholderData: keepPreviousData,
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const favoriteAppsPage = favoriteAppsQuery.data
  const favoriteApps = favoriteAppsPage?.list ?? []
  const totalFavoriteApps = Number(favoriteAppsPage?.total ?? 0)
  const isSubmittingFavorite = createFavoriteMutation.isPending || updateFavoriteMutation.isPending
  const selectableMoveFavorites = orderedFavorites.filter(
    (favorite): favorite is FavoriteVO & { id: string } =>
      Boolean(favorite.id && favorite.id !== selectedFavorite?.id),
  )
  const moveFavoriteOptions = selectableMoveFavorites.map((favorite) => ({
    value: favorite.id,
    label: getFavoriteName(favorite),
  }))

  useEffect(() => {
    setOrderedFavorites(normalizeFavorites(favoritesQuery.data ?? []))
  }, [favoritesQuery.data])

  useEffect(() => {
    orderedFavoritesRef.current = orderedFavorites
  }, [orderedFavorites])

  useEffect(() => {
    if (orderedFavorites.length === 0) {
      setSelectedFavoriteId(undefined)
      return
    }

    if (
      selectedFavoriteId &&
      orderedFavorites.some((favorite) => favorite.id === selectedFavoriteId)
    ) {
      return
    }

    setSelectedFavoriteId(orderedFavorites[0]?.id)
  }, [orderedFavorites, selectedFavoriteId])

  useEffect(() => {
    setCurrentPage(1)
  }, [appKeyword, selectedFavoriteId])

  useEffect(() => {
    if (!isFavoriteModalOpen) {
      return
    }

    favoriteForm.setFieldsValue({
      name: editingFavorite?.name ?? '',
      description: editingFavorite?.description ?? '',
    })
  }, [editingFavorite, favoriteForm, isFavoriteModalOpen])

  useEffect(() => {
    if (!movingApp) {
      return
    }

    moveForm.resetFields()
  }, [moveForm, movingApp])

  const refreshFavorites = async () => {
    await invalidateListFavorites(queryClient)
  }

  const refreshFavoriteApps = async () => {
    if (!selectedFavorite?.id) {
      return
    }

    await invalidateListFavoriteApps(queryClient, selectedFavorite.id, favoriteAppsQueryParams)
  }

  const refreshAfterAppChange = async () => {
    await refreshFavorites()

    if (favoriteApps.length === 1 && currentPage > 1) {
      setCurrentPage((page) => Math.max(1, page - 1))
      return
    }

    await refreshFavoriteApps()
  }

  const closeFavoriteModal = () => {
    if (isSubmittingFavorite) {
      return
    }

    setIsFavoriteModalOpen(false)
    setEditingFavorite(null)
    favoriteForm.resetFields()
  }

  const openCreateModal = () => {
    setEditingFavorite(null)
    setIsFavoriteModalOpen(true)
  }

  const openEditModal = (favorite: FavoriteVO) => {
    if (favorite.isDefault) {
      return
    }

    setEditingFavorite(favorite)
    setIsFavoriteModalOpen(true)
  }

  const handleSelectFavorite = (favorite: FavoriteVO) => {
    if (!favorite.id) {
      return
    }

    setSelectedFavoriteId(favorite.id)
  }

  const handleSubmitFavorite = async (values: FavoriteFormValues) => {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
    }

    try {
      if (editingFavorite?.id) {
        await updateFavoriteMutation.mutateAsync({
          favoriteId: editingFavorite.id,
          data: payload,
        })
        message.success('收藏夹已更新')
      } else {
        const response = await createFavoriteMutation.mutateAsync({
          data: payload,
        })

        setSelectedFavoriteId(response.data?.id)
        message.success('收藏夹已创建')
      }

      await refreshFavorites()
      closeFavoriteModal()
    } catch (error) {
      message.error(getErrorMessage(error, editingFavorite ? '更新收藏夹失败' : '创建收藏夹失败'))
    }
  }

  const confirmDeleteFavorite = (favorite: FavoriteVO) => {
    if (!favorite.id || favorite.isDefault) {
      return
    }

    modal.confirm({
      centered: true,
      title: `删除收藏夹「${getFavoriteName(favorite)}」？`,
      content: '删除后收藏夹将不可恢复，收藏夹内的应用收藏关系也会被移除。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        try {
          await deleteFavoriteMutation.mutateAsync({ favoriteId: favorite.id! })

          if (favorite.id === selectedFavorite?.id) {
            setSelectedFavoriteId(undefined)
          }

          await refreshFavorites()
          message.success('收藏夹已删除')
        } catch (error) {
          message.error(getErrorMessage(error, '删除收藏夹失败'))
          throw error
        }
      },
    })
  }

  const handleFavoriteDragStart = (event: DragEvent<HTMLLIElement>, favorite: FavoriteVO) => {
    if (!favorite.id || favorite.isDefault || sortFavoritesMutation.isPending) {
      event.preventDefault()
      return
    }

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', favorite.id)
    setDraggingFavoriteId(favorite.id)
    setDragSnapshot(orderedFavorites)
  }

  const handleFavoriteDragOver = (event: DragEvent<HTMLLIElement>, targetFavorite: FavoriteVO) => {
    if (!draggingFavoriteId || !targetFavorite.id || targetFavorite.isDefault) {
      return
    }

    event.preventDefault()
    setOrderedFavorites((currentFavorites) =>
      moveFavoriteAroundTarget(currentFavorites, draggingFavoriteId, targetFavorite.id!),
    )
  }

  const persistFavoriteOrder = async (
    nextFavorites: FavoriteVO[],
    previousFavorites: FavoriteVO[],
  ) => {
    if (areFavoriteOrdersEqual(nextFavorites, previousFavorites)) {
      return
    }

    try {
      await sortFavoritesMutation.mutateAsync({
        data: {
          favorites: buildSortFavoritesPayload(nextFavorites),
        },
      })
      await refreshFavorites()
      message.success('收藏夹顺序已更新')
    } catch (error) {
      setOrderedFavorites(previousFavorites)
      message.error(getErrorMessage(error, '排序保存失败'))
    }
  }

  const handleFavoriteDragEnd = () => {
    const previousFavorites = dragSnapshot
    const nextFavorites = orderedFavoritesRef.current

    setDraggingFavoriteId(null)
    setDragSnapshot(null)

    if (!previousFavorites) {
      return
    }

    void persistFavoriteOrder(nextFavorites, previousFavorites)
  }

  const handleSearchApps = () => {
    setAppKeyword(keywordInput.trim())
  }

  const handleResetAppsSearch = () => {
    setKeywordInput('')
    setAppKeyword('')
  }

  const closeMoveModal = () => {
    if (moveFavoriteAppMutation.isPending) {
      return
    }

    setMovingApp(null)
    moveForm.resetFields()
  }

  const handleMoveApp = async (values: MoveFavoriteFormValues) => {
    if (!selectedFavorite?.id || !movingApp?.id) {
      return
    }

    try {
      await moveFavoriteAppMutation.mutateAsync({
        favoriteId: selectedFavorite.id,
        data: {
          appId: movingApp.id,
          targetFavoriteId: values.targetFavoriteId,
        },
      })
      await refreshAfterAppChange()
      message.success('应用已移动')
      closeMoveModal()
    } catch (error) {
      message.error(getErrorMessage(error, '移动应用失败'))
    }
  }

  const confirmRemoveApp = (app: AppVO) => {
    if (!selectedFavorite?.id || !app.id) {
      return
    }

    modal.confirm({
      centered: true,
      title: `移出「${getAppDisplayName(app)}」？`,
      content: '移出后，该应用将不再出现在当前收藏夹中。',
      okText: '移出',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        try {
          await removeFavoriteAppMutation.mutateAsync({
            favoriteId: selectedFavorite.id!,
            appId: app.id!,
          })
          await refreshAfterAppChange()
          message.success('应用已移出收藏夹')
        } catch (error) {
          message.error(getErrorMessage(error, '移出应用失败'))
          throw error
        }
      },
    })
  }

  const renderFavoriteList = () => {
    if (favoritesQuery.isError) {
      return (
        <Alert
          showIcon
          type="error"
          title="收藏夹加载失败"
          description={getErrorMessage(favoritesQuery.error, '请稍后重试')}
          action={
            <Button
              size="small"
              icon={<RotateCcw className="size-4" />}
              onClick={() => void favoritesQuery.refetch()}
            >
              重试
            </Button>
          }
          className="rounded-2xl"
        />
      )
    }

    if (favoritesQuery.isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              active
              avatar={false}
              paragraph={{ rows: 1 }}
              title={{ width: '60%' }}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
            />
          ))}
        </div>
      )
    }

    if (orderedFavorites.length === 0) {
      return (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无收藏夹"
          />
        </div>
      )
    }

    return (
      <ul className="m-0 list-none space-y-2 p-0">
        {orderedFavorites.map((favorite, index) => {
          const favoriteKey = favorite.id ?? `${favorite.name ?? 'favorite'}-${index}`
          const isSelected = Boolean(favorite.id && favorite.id === selectedFavorite?.id)
          const isDraggable = Boolean(
            favorite.id && !favorite.isDefault && !sortFavoritesMutation.isPending,
          )

          return (
            <li
              key={favoriteKey}
              draggable={isDraggable}
              onDragStart={(event) => handleFavoriteDragStart(event, favorite)}
              onDragOver={(event) => handleFavoriteDragOver(event, favorite)}
              onDrop={(event) => event.preventDefault()}
              onDragEnd={handleFavoriteDragEnd}
              className={`group rounded-2xl border transition-colors ${
                isSelected
                  ? 'border-sky-200 bg-sky-50'
                  : 'border-slate-100 bg-slate-50/60 hover:border-slate-200 hover:bg-white'
              } ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <button
                type="button"
                onClick={() => handleSelectFavorite(favorite)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left"
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                    favorite.isDefault
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-white text-slate-400 group-hover:text-slate-500'
                  }`}
                  aria-hidden="true"
                >
                  <GripVertical className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-950">
                      {getFavoriteName(favorite)}
                    </span>
                    {favorite.isDefault ? (
                      <Tag
                        color="blue"
                        className="m-0 shrink-0"
                      >
                        默认
                      </Tag>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {Number(favorite.appCount ?? 0)} 个应用
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  const renderAppAction = (app: AppVO) => {
    const appName = getAppDisplayName(app)

    return (
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'move',
              label: '移动到...',
              icon: <MoveRight className="size-4" />,
              disabled: moveFavoriteOptions.length === 0,
            },
            {
              key: 'remove',
              label: '移出收藏夹',
              icon: <X className="size-4" />,
              danger: true,
            },
          ],
          onClick: ({ key, domEvent }) => {
            domEvent.stopPropagation()

            if (key === 'move') {
              setMovingApp(app)
              return
            }

            if (key === 'remove') {
              confirmRemoveApp(app)
            }
          },
        }}
      >
        <Button
          type="text"
          aria-label={`${appName} 更多操作`}
          icon={<MoreVertical className="size-5" />}
          className="h-10 w-10 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100!"
          onClick={(event) => event.stopPropagation()}
        />
      </Dropdown>
    )
  }

  const renderAppsSection = () => {
    if (!selectedFavorite?.id) {
      return (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请选择收藏夹"
          />
        </div>
      )
    }

    if (favoriteAppsQuery.isError) {
      return (
        <Alert
          showIcon
          type="error"
          title="应用加载失败"
          description={getErrorMessage(favoriteAppsQuery.error, '请稍后重试')}
          action={
            <Button
              size="small"
              icon={<RotateCcw className="size-4" />}
              onClick={() => void favoriteAppsQuery.refetch()}
            >
              重试
            </Button>
          }
          className="rounded-2xl"
        />
      )
    }

    if (favoriteAppsQuery.isLoading) {
      return (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: APP_PAGE_SIZE }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5"
            >
              <div className="aspect-16/10 bg-slate-100" />
              <div className="p-4">
                <Skeleton
                  active
                  avatar={{ size: 44 }}
                  paragraph={{ rows: 1 }}
                  title={{ width: '70%' }}
                />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (favoriteApps.length === 0) {
      return (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={appKeyword ? '没有匹配的应用' : '当前收藏夹暂无应用'}
          />
        </div>
      )
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {favoriteApps.map((app, index) => {
            const appCardData = mapAppToPublicCaseData(app)
            const appKey = app.id ?? `${app.name ?? 'favorite-app'}-${index}`

            return (
              <PublicCaseCard
                key={appKey}
                appCase={appCardData}
                action={renderAppAction(app)}
                onOpen={() => {
                  if (!app.id) {
                    return
                  }

                  void navigate({
                    to: '/workbench/$appId',
                    params: { appId: app.id },
                  })
                }}
              />
            )
          })}
        </div>

        <div className="mt-6 flex justify-center">
          <Pagination
            current={favoriteAppsPage?.pageNum ?? currentPage}
            pageSize={favoriteAppsPage?.pageSize ?? APP_PAGE_SIZE}
            total={totalFavoriteApps}
            showSizeChanger={false}
            onChange={setCurrentPage}
          />
        </div>
      </>
    )
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl font-bold text-slate-950">收藏夹</h2>
          </div>
          <Button
            type="primary"
            icon={<FolderPlus className="size-4" />}
            onClick={openCreateModal}
            className="h-10 rounded-full px-3 shadow-none"
          >
            新建
          </Button>
        </div>

        {renderFavoriteList()}
      </aside>

      <div className="min-w-0 space-y-5">
        <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
          {selectedFavorite ? (
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="m-0 truncate text-2xl font-bold text-slate-950">
                    {getFavoriteName(selectedFavorite)}
                  </h2>
                  {selectedFavorite.isDefault ? (
                    <Tag
                      color="blue"
                      className="m-0 shrink-0"
                    >
                      默认
                    </Tag>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {selectedFavorite.description || '暂无说明'}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
                  <span>{Number(selectedFavorite.appCount ?? 0)} 个应用</span>
                  <span>创建于 {formatProfileDateTime(selectedFavorite.createdAt)}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Tooltip title={selectedFavorite.isDefault ? '默认收藏夹不可编辑' : undefined}>
                  <span>
                    <Button
                      disabled={selectedFavorite.isDefault}
                      icon={<PencilLine className="size-4" />}
                      onClick={() => openEditModal(selectedFavorite)}
                      className="rounded-full"
                    >
                      编辑
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title={selectedFavorite.isDefault ? '默认收藏夹不可删除' : undefined}>
                  <span>
                    <Button
                      danger
                      disabled={selectedFavorite.isDefault}
                      icon={<Trash2 className="size-4" />}
                      onClick={() => confirmDeleteFavorite(selectedFavorite)}
                      className="rounded-full"
                    >
                      删除
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无收藏夹"
            />
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h3 className="m-0 text-xl font-bold text-slate-950">收藏的应用</h3>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
              <Input
                allowClear
                prefix={<Search className="size-4 text-slate-400" />}
                placeholder="搜索应用"
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onPressEnter={handleSearchApps}
                className="h-10 min-w-0 rounded-full sm:w-72"
              />
              <Button
                type="primary"
                icon={<Search className="size-4" />}
                onClick={handleSearchApps}
                className="h-10 rounded-full px-4 shadow-none"
              >
                搜索
              </Button>
              {appKeyword ? (
                <Button
                  icon={<RotateCcw className="size-4" />}
                  onClick={handleResetAppsSearch}
                  className="h-10 rounded-full px-4"
                >
                  重置
                </Button>
              ) : null}
            </div>
          </div>

          {renderAppsSection()}
        </section>
      </div>

      <Modal
        title={editingFavorite ? '编辑收藏夹' : '新建收藏夹'}
        open={isFavoriteModalOpen}
        centered
        destroyOnHidden
        confirmLoading={isSubmittingFavorite}
        onCancel={closeFavoriteModal}
        onOk={() => void favoriteForm.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={favoriteForm}
          layout="vertical"
          colon={false}
          requiredMark={false}
          onFinish={(values) => void handleSubmitFavorite(values)}
          className="pt-3 [&_.ant-form-item]:mb-5"
        >
          <Form.Item
            name="name"
            label="收藏夹名称"
            validateFirst
            rules={[
              {
                validator: (_, value: string | undefined) => {
                  if (!value?.trim()) {
                    return Promise.reject(new Error('请输入收藏夹名称'))
                  }

                  return Promise.resolve()
                },
              },
              { max: 100, message: '收藏夹名称最多100个字符' },
            ]}
          >
            <Input
              maxLength={100}
              showCount
              placeholder="请输入收藏夹名称"
              className="h-11 rounded-xl"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="说明"
            rules={[{ max: 500, message: '说明最多500个字符' }]}
          >
            <Input.TextArea
              rows={4}
              maxLength={500}
              showCount
              allowClear
              placeholder="补充收藏夹说明"
              className="rounded-2xl"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="移动应用到收藏夹"
        open={Boolean(movingApp)}
        centered
        destroyOnHidden
        confirmLoading={moveFavoriteAppMutation.isPending}
        okButtonProps={{
          disabled: moveFavoriteOptions.length === 0,
        }}
        onCancel={closeMoveModal}
        onOk={() => void moveForm.submit()}
        okText="移动"
        cancelText="取消"
      >
        <Form
          form={moveForm}
          layout="vertical"
          colon={false}
          requiredMark={false}
          onFinish={(values) => void handleMoveApp(values)}
          className="pt-3 [&_.ant-form-item]:mb-5"
        >
          <p className="mt-0 text-sm leading-6 text-slate-500">
            将「{movingApp ? getAppDisplayName(movingApp) : '该应用'}」移动到其他收藏夹。
          </p>
          <Form.Item
            name="targetFavoriteId"
            label="目标收藏夹"
            rules={[{ required: true, message: '请选择目标收藏夹' }]}
          >
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              placeholder="请选择目标收藏夹"
              options={moveFavoriteOptions}
              notFoundContent="没有可移动到的收藏夹"
              className="h-11"
            />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
