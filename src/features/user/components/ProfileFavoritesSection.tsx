import {
  invalidateListFavorites,
  useCreateFavorite,
  useDeleteFavorite,
  useListFavorites,
  useUpdateFavorite,
} from '@/api/generated/endpoints/favorite'
import type { FavoriteVO } from '@/api/generated/models'
import { queryClient } from '@/libs/query-client'
import { App, Button, Empty, Form, Input, Modal, Skeleton, Tag } from 'antd'
import { FolderPlus, PencilLine, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { formatProfileDateTime, getErrorMessage } from '../utils/profile'

interface FavoriteFormValues {
  name: string
  description?: string
}

export function ProfileFavoritesSection() {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<FavoriteFormValues>()
  const [editingFavorite, setEditingFavorite] = useState<FavoriteVO | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const favoritesQuery = useListFavorites<FavoriteVO[] | undefined, { message?: string }>({
    query: {
      retry: false,
      select: (response) => response.data,
    },
  })
  const createFavoriteMutation = useCreateFavorite<{ message?: string }>()
  const updateFavoriteMutation = useUpdateFavorite<{ message?: string }>()
  const deleteFavoriteMutation = useDeleteFavorite<{ message?: string }>()
  const favorites = favoritesQuery.data ?? []
  const isSubmitting = createFavoriteMutation.isPending || updateFavoriteMutation.isPending

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    form.setFieldsValue({
      name: editingFavorite?.name ?? '',
      description: editingFavorite?.description ?? '',
    })
  }, [editingFavorite, form, isModalOpen])

  const closeModal = () => {
    if (isSubmitting) {
      return
    }

    setIsModalOpen(false)
    setEditingFavorite(null)
    form.resetFields()
  }

  const openCreateModal = () => {
    setEditingFavorite(null)
    setIsModalOpen(true)
  }

  const openEditModal = (favorite: FavoriteVO) => {
    setEditingFavorite(favorite)
    setIsModalOpen(true)
  }

  const handleSubmit = async (values: FavoriteFormValues) => {
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
        await createFavoriteMutation.mutateAsync({
          data: payload,
        })
        message.success('收藏夹已创建')
      }

      await invalidateListFavorites(queryClient)
      closeModal()
    } catch (error) {
      message.error(getErrorMessage(error, editingFavorite ? '更新收藏夹失败' : '创建收藏夹失败'))
    }
  }

  const confirmDelete = (favorite: FavoriteVO) => {
    if (!favorite.id || favorite.isDefault) {
      return
    }

    modal.confirm({
      centered: true,
      title: `删除收藏夹「${favorite.name || '未命名收藏夹'}」？`,
      content: '删除后收藏夹将不可恢复，收藏夹内的应用收藏关系也会被移除。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        try {
          await deleteFavoriteMutation.mutateAsync({ favoriteId: favorite.id! })
          await invalidateListFavorites(queryClient)
          message.success('收藏夹已删除')
        } catch (error) {
          message.error(getErrorMessage(error, '删除收藏夹失败'))
          throw error
        }
      },
    })
  }

  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="m-0 text-2xl font-bold text-slate-950">收藏夹管理</h2>
          <p className="mt-2 text-sm text-slate-500">管理你的收藏夹名称和说明。</p>
        </div>
        <Button
          type="primary"
          icon={<FolderPlus className="size-4" />}
          onClick={openCreateModal}
          className="h-10 rounded-full px-4 shadow-none"
        >
          新建收藏夹
        </Button>
      </div>

      {favoritesQuery.isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {getErrorMessage(favoritesQuery.error, '收藏夹加载失败，请稍后重试')}
        </div>
      ) : favoritesQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              active
              avatar={false}
              paragraph={{ rows: 2 }}
              title={{ width: '30%' }}
              className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
            />
          ))}
        </div>
      ) : favorites.length > 0 ? (
        <ul className="m-0 list-none space-y-3 p-0">
          {favorites.map((favorite, index) => {
            const favoriteKey = favorite.id ?? `${favorite.name ?? 'favorite'}-${index}`

            return (
              <li
                key={favoriteKey}
                className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-base font-semibold text-slate-900">
                      {favorite.name || '未命名收藏夹'}
                    </span>
                    {favorite.isDefault ? (
                      <Tag
                        color="blue"
                        className="m-0 shrink-0"
                      >
                        默认
                      </Tag>
                    ) : null}
                  </div>
                  <div className="mt-1 space-y-1">
                    <p className="m-0 text-sm text-slate-500">
                      {favorite.description || '暂无说明'}
                    </p>
                    <p className="m-0 text-xs text-slate-400">
                      {Number(favorite.appCount ?? 0)} 个应用 · 创建于{' '}
                      {formatProfileDateTime(favorite.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    icon={<PencilLine className="size-4" />}
                    onClick={() => openEditModal(favorite)}
                    className="rounded-full"
                  >
                    编辑
                  </Button>
                  <Button
                    danger
                    disabled={favorite.isDefault}
                    icon={<Trash2 className="size-4" />}
                    onClick={() => confirmDelete(favorite)}
                    className="rounded-full"
                  >
                    删除
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无收藏夹"
          />
        </div>
      )}

      <Modal
        title={editingFavorite ? '编辑收藏夹' : '新建收藏夹'}
        open={isModalOpen}
        centered
        destroyOnHidden
        confirmLoading={isSubmitting}
        onCancel={closeModal}
        onOk={() => void form.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          colon={false}
          requiredMark={false}
          onFinish={(values) => void handleSubmit(values)}
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
    </section>
  )
}
