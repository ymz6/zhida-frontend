import { useReviewAudit } from '@/api/generated/endpoints/admin-audit'
import { ReviewAuditRequestStatus } from '@/api/generated/models'
import type { AppVO, AuditRecordVO } from '@/api/generated/models'
import { useQueryClient } from '@tanstack/react-query'
import { App, Button, Form, Input, Space } from 'antd'
import { CheckCircle2, XCircle } from 'lucide-react'

import {
  canApproveAuditRecord,
  canRejectAuditRecord,
  getCaseErrorMessage,
  invalidateAppCaseQueries,
  invalidateCaseAuditQueries,
} from '../utils/caseManagement'
import { AuditRecordStatusTag } from './CaseStatusTag'

const REVIEW_REMARK_MAX_LENGTH = 500

interface AuditActionFormValues {
  approveRemark?: string
  rejectRemark?: string
}

export function CaseAuditActionPanel({
  auditRecord,
  app,
}: {
  auditRecord: AuditRecordVO
  app: AppVO
}) {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm<AuditActionFormValues>()
  const queryClient = useQueryClient()
  const recordId = auditRecord.id
  const canApprove = canApproveAuditRecord(auditRecord, app)
  const canReject = canRejectAuditRecord(auditRecord)

  const refreshAfterMutation = async () => {
    await invalidateCaseAuditQueries(queryClient, recordId)

    if (app.id) {
      await invalidateAppCaseQueries(queryClient, app.id)
    }
  }

  const reviewAuditMutation = useReviewAudit<{ message?: string }>({
    mutation: {
      onSuccess: async () => {
        message.success('审核操作已提交')
        await refreshAfterMutation()
      },
      onError: (error) => {
        message.error(getCaseErrorMessage(error, '审核操作失败，请稍后重试'))
      },
    },
  })

  const confirmApprove = () => {
    if (!recordId || !canApprove) {
      return
    }

    const remark = form.getFieldValue('approveRemark')?.trim()

    modal.confirm({
      centered: true,
      title: '确认通过审核？',
      content: '通过后应用将进入案例广场。',
      okText: '通过审核',
      cancelText: '取消',
      onOk: () =>
        reviewAuditMutation.mutateAsync({
          recordId,
          data: {
            status: ReviewAuditRequestStatus.APPROVED,
            remark: remark || undefined,
          },
        }),
    })
  }

  const confirmReject = async () => {
    if (!recordId || !canReject) {
      return
    }

    try {
      await form.validateFields(['rejectRemark'])
    } catch {
      return
    }

    const remark = form.getFieldValue('rejectRemark')?.trim()

    modal.confirm({
      centered: true,
      title: '确认拒绝审核？',
      content: '拒绝后应用不会进入案例广场，审核意见将作为处理记录保存。',
      okText: '拒绝审核',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () =>
        reviewAuditMutation.mutateAsync({
          recordId,
          data: {
            status: ReviewAuditRequestStatus.REJECTED,
            remark,
          },
        }),
    })
  }

  return (
    <section className="sticky top-24 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="m-0 text-base font-semibold text-slate-950">审核操作</h2>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-medium text-slate-900">当前审核记录</span>
          <AuditRecordStatusTag status={auditRecord.status} />
        </div>
        <p className="m-0 wrap-break-word">{auditRecord.remark?.trim() || '暂无审核意见'}</p>
      </div>

      <Form
        form={form}
        layout="vertical"
        preserve
      >
        {canReject ? (
          <>
            <Form.Item
              label="通过备注"
              name="approveRemark"
              rules={[{ max: REVIEW_REMARK_MAX_LENGTH, message: '审核意见最多 500 字' }]}
            >
              <Input.TextArea
                rows={3}
                maxLength={REVIEW_REMARK_MAX_LENGTH}
                showCount
              />
            </Form.Item>
            <Form.Item
              label="拒绝原因"
              name="rejectRemark"
              rules={[
                { required: true, whitespace: true, message: '请填写拒绝原因' },
                { max: REVIEW_REMARK_MAX_LENGTH, message: '审核意见最多 500 字' },
              ]}
            >
              <Input.TextArea
                rows={4}
                maxLength={REVIEW_REMARK_MAX_LENGTH}
                showCount
              />
            </Form.Item>
            <Space wrap>
              <Button
                type="primary"
                icon={<CheckCircle2 className="size-4" />}
                disabled={!canApprove}
                loading={reviewAuditMutation.isPending}
                onClick={confirmApprove}
              >
                通过
              </Button>
              <Button
                danger
                icon={<XCircle className="size-4" />}
                loading={reviewAuditMutation.isPending}
                onClick={() => void confirmReject()}
              >
                拒绝
              </Button>
            </Space>
          </>
        ) : (
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
            当前审核记录已处理，只能查看审核上下文。
          </div>
        )}
      </Form>
    </section>
  )
}
