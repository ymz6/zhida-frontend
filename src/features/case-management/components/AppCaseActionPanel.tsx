import { useSetAppFeatured, useSwitchAppAuditStatus } from '@/api/generated/endpoints/admin-audit'
import { SwitchAuditStatusRequestStatus } from '@/api/generated/models'
import type { AppVO } from '@/api/generated/models'
import { useQueryClient } from '@tanstack/react-query'
import { App, Button, Divider, Form, Input, Switch } from 'antd'
import { Trash2, Undo2 } from 'lucide-react'

import {
  APP_AUDIT_STATUS,
  canManageFeatured,
  canOfflineAppCase,
  canReopenAppCase,
  getCaseErrorMessage,
  hasDeployUrl,
  invalidateAppCaseQueries,
} from '../utils/caseManagement'
import { AppCaseStatusTag, FeaturedStatusTag } from './CaseStatusTag'

const REVIEW_REMARK_MAX_LENGTH = 500

interface AppCaseActionFormValues {
  offlineRemark?: string
  reopenRemark?: string
}

export function AppCaseActionPanel({ app }: { app: AppVO }) {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<AppCaseActionFormValues>()
  const queryClient = useQueryClient()
  const appId = app.id
  const canOffline = canOfflineAppCase(app)
  const canReopen = canReopenAppCase(app)

  const refreshAfterMutation = async () => {
    await invalidateAppCaseQueries(queryClient, appId)
  }

  const switchAuditStatusMutation = useSwitchAppAuditStatus<{ message?: string }>({
    mutation: {
      onSuccess: async () => {
        message.success('应用案例状态已更新')
        await refreshAfterMutation()
      },
      onError: (error) => {
        message.error(getCaseErrorMessage(error, '应用案例状态更新失败，请稍后重试'))
      },
    },
  })

  const setFeaturedMutation = useSetAppFeatured<{ message?: string }>({
    mutation: {
      onSuccess: async () => {
        message.success('精选状态已更新')
        await refreshAfterMutation()
      },
      onError: (error) => {
        message.error(getCaseErrorMessage(error, '精选状态更新失败，请稍后重试'))
      },
    },
  })

  const confirmOffline = async () => {
    if (!appId || !canOffline) {
      return
    }

    try {
      await form.validateFields(['offlineRemark'])
    } catch {
      return
    }

    const remark = form.getFieldValue('offlineRemark')?.trim()

    modal.confirm({
      centered: true,
      title: '确认下架案例？',
      content: '下架后应用会从案例广场移除。',
      okText: '下架案例',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () =>
        switchAuditStatusMutation.mutateAsync({
          appId,
          data: {
            status: SwitchAuditStatusRequestStatus.REJECTED,
            remark,
          },
        }),
    })
  }

  const confirmReopen = () => {
    if (!appId || !canReopen) {
      return
    }

    const remark = form.getFieldValue('reopenRemark')?.trim()
    const content = hasDeployUrl(app)
      ? '重新公开后应用会进入案例广场。'
      : '该应用没有部署地址，重新公开后会出现已公开但不可查看运行效果的异常状态。'

    modal.confirm({
      centered: true,
      title: '确认重新公开？',
      content,
      okText: '重新公开',
      cancelText: '取消',
      onOk: () =>
        switchAuditStatusMutation.mutateAsync({
          appId,
          data: {
            status: SwitchAuditStatusRequestStatus.APPROVED,
            remark: remark || undefined,
          },
        }),
    })
  }

  const confirmFeaturedChange = (featured: boolean) => {
    if (!appId || !canManageFeatured(app)) {
      return
    }

    modal.confirm({
      centered: true,
      title: featured ? '确认设为精选？' : '确认取消精选？',
      content: featured
        ? '设为精选后应用会在案例广场获得更高展示优先级。'
        : '取消后应用仍在案例广场中公开。',
      okText: featured ? '设为精选' : '取消精选',
      cancelText: '取消',
      onOk: () =>
        setFeaturedMutation.mutateAsync({
          appId,
          data: { featured },
        }),
    })
  }

  return (
    <section className="sticky top-24 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="m-0 text-base font-semibold text-slate-950">应用案例操作</h2>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-medium text-slate-900">当前案例状态</span>
          <AppCaseStatusTag status={app.auditStatus} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>精选状态</span>
          <FeaturedStatusTag
            featured={app.featured}
            disabled={!canManageFeatured(app)}
          />
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        preserve
      >
        {canOffline ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">精选开关</div>
                <p className="m-0 mt-1 text-sm text-slate-500">仅已公开应用可以设置精选。</p>
              </div>
              <Switch
                checked={Boolean(app.featured)}
                loading={setFeaturedMutation.isPending}
                onChange={confirmFeaturedChange}
              />
            </div>
            <Divider />
            <Form.Item
              label="下架原因"
              name="offlineRemark"
              rules={[
                { required: true, whitespace: true, message: '请填写下架原因' },
                { max: REVIEW_REMARK_MAX_LENGTH, message: '审核意见最多 500 字' },
              ]}
            >
              <Input.TextArea
                rows={4}
                maxLength={REVIEW_REMARK_MAX_LENGTH}
                showCount
              />
            </Form.Item>
            <Button
              danger
              icon={<Trash2 className="size-4" />}
              loading={switchAuditStatusMutation.isPending}
              onClick={() => void confirmOffline()}
            >
              下架案例
            </Button>
          </>
        ) : null}

        {canReopen ? (
          <>
            <Form.Item
              label="重新公开备注"
              name="reopenRemark"
              rules={[{ max: REVIEW_REMARK_MAX_LENGTH, message: '审核意见最多 500 字' }]}
            >
              <Input.TextArea
                rows={4}
                maxLength={REVIEW_REMARK_MAX_LENGTH}
                showCount
              />
            </Form.Item>
            <Button
              type="primary"
              icon={<Undo2 className="size-4" />}
              loading={switchAuditStatusMutation.isPending}
              onClick={confirmReopen}
            >
              重新公开
            </Button>
          </>
        ) : null}

        {!canOffline && !canReopen ? (
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
            {app.auditStatus === APP_AUDIT_STATUS.PENDING
              ? '该应用仍在审核流程中，请前往案例审核管理处理。'
              : '当前状态只读，不提供公开或精选管理操作。'}
          </div>
        ) : null}
      </Form>
    </section>
  )
}
