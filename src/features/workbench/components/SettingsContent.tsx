import { invalidateGetApp, useDeleteApp, useEditApp } from '@/api/generated/endpoints/app'
import type { AppVO } from '@/api/generated/models'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { App, Avatar, Button, Empty, Form, Input, Popconfirm } from 'antd'
import { Save, Trash2, User } from 'lucide-react'

interface SettingsFormValues {
  name: string
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return '-'
  }

  return value.replace('T', ' ').slice(0, 19)
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

export function SettingsContent({ app }: { app?: AppVO }) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<SettingsFormValues>()
  const appId = app?.id
  const authorName = app?.author?.nickname?.trim() || '未知用户'
  const initialPrompt = app?.initPrompt?.trim()

  const editMutation = useEditApp<{ message?: string }>({
    mutation: {
      onSuccess: async (_response, variables) => {
        message.success('应用名称已保存')
        // 保存成功后刷新详情，保持头部标题和设置页数据一致。
        await invalidateGetApp(queryClient, variables.appId)
      },
      onError: (error) => {
        message.error(getErrorMessage(error, '应用名称保存失败，请稍后重试'))
      },
    },
  })

  const deleteMutation = useDeleteApp<{ message?: string }>({
    mutation: {
      onSuccess: () => {
        message.success('应用已删除')
        void navigate({ to: '/', replace: true })
      },
      onError: (error) => {
        message.error(getErrorMessage(error, '应用删除失败，请稍后重试'))
      },
    },
  })

  useEffect(() => {
    // app 详情可能由重新加载或保存后刷新，表单值需要跟随最新名称同步。
    form.setFieldsValue({
      name: app?.name ?? '',
    })
  }, [app?.name, form])

  const handleSaveBasicInfo = (values: SettingsFormValues) => {
    if (!appId) {
      return
    }

    const name = values.name.trim()

    if (name === (app?.name ?? '').trim()) {
      message.info('应用名称没有变化')
      return
    }

    editMutation.mutate({
      appId,
      data: { name },
    })
  }

  const handleDeleteApp = () => {
    if (!appId) {
      return
    }

    deleteMutation.mutate({ appId })
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto bg-white p-6 sm:p-8">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="mb-6 text-xl font-semibold text-slate-900">应用设置</h2>

        <div className="space-y-8">
          <section>
            <h3 className="mb-4 text-sm font-medium text-slate-900">基本信息</h3>
            <div className="space-y-5 rounded-lg border border-slate-200 p-4">
              <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                onFinish={handleSaveBasicInfo}
              >
                <Form.Item
                  name="name"
                  label="应用名称"
                  rules={[
                    { required: true, whitespace: true, message: '请输入应用名称' },
                    { max: 20, message: '应用名称最多 20 个字符' },
                  ]}
                  className="mb-0"
                >
                  <Input
                    placeholder="给应用起个名字"
                    maxLength={20}
                    showCount
                  />
                </Form.Item>
                <div className="mt-4 flex justify-end">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={editMutation.isPending}
                    disabled={!appId}
                    icon={
                      <Save
                        className="size-4"
                        aria-hidden="true"
                      />
                    }
                  >
                    保存
                  </Button>
                </div>
              </Form>

              <div>
                <div className="mb-1.5 text-sm text-slate-600">应用 ID</div>
                <div className="break-all rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                  {appId || '-'}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-sm text-slate-600">初始提示词</div>
                {initialPrompt ? (
                  <Input.TextArea
                    value={initialPrompt}
                    readOnly
                    autoSize={{ minRows: 4, maxRows: 8 }}
                  />
                ) : (
                  <div className="rounded-md border border-dashed border-slate-200 py-6">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无初始提示词"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-sm font-medium text-slate-900">创建信息</h3>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <Avatar
                  icon={
                    <User
                      className="size-4"
                      aria-hidden="true"
                    />
                  }
                  src={app?.author?.avatar}
                  size="default"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{authorName}</div>
                  <div className="text-xs text-slate-500">
                    创建于 {formatDateTime(app?.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-sm font-medium text-red-600">危险操作</h3>
            <div className="rounded-lg border border-red-200 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-red-600">删除应用</div>
                  <div className="text-xs text-red-500/80">此操作无法撤销，请谨慎操作</div>
                </div>
                <Popconfirm
                  title="删除应用？"
                  description="删除后将无法恢复，确定继续吗？"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
                  onConfirm={handleDeleteApp}
                >
                  <Button
                    danger
                    disabled={!appId}
                    loading={deleteMutation.isPending}
                    icon={
                      <Trash2
                        className="size-4"
                        aria-hidden="true"
                      />
                    }
                  >
                    删除
                  </Button>
                </Popconfirm>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
