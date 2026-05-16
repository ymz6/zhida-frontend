import { useSubmitCase } from '@/api/generated/endpoints/app-case'
import type { SubmitAppCaseRequest } from '@/api/generated/models'
import { useQueryClient } from '@tanstack/react-query'
import { App, Button, Flex, Form, Input, Modal } from 'antd'
import { useEffect } from 'react'

import { invalidateCaseQueries } from '../utils/case'

interface SubmitCaseFormValues {
  title: string
  summary: string
}

/**
 * @deprecated 旧案例投稿弹窗，仅为工作台渐进移除保留；后续请替换为新的案例流程或直接下线。
 */
export function SubmitCaseModal({
  appId,
  initialTitle,
  initialSummary,
  open,
  onCancel,
  onSuccess,
}: {
  appId?: string
  initialTitle?: string
  initialSummary?: string
  open: boolean
  onCancel: () => void
  onSuccess?: () => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm<SubmitCaseFormValues>()
  const queryClient = useQueryClient()
  const submitCaseMutation = useSubmitCase()

  useEffect(() => {
    if (!open) {
      return
    }

    form.setFieldsValue({
      title: initialTitle?.trim().slice(0, 128) ?? '',
      summary: initialSummary?.trim().slice(0, 512) ?? '',
    })
  }, [form, initialSummary, initialTitle, open])

  const handleSubmit = async (values: SubmitCaseFormValues) => {
    if (!appId) {
      message.error('缺少应用 ID，无法提交案例')
      return
    }

    const payload: SubmitAppCaseRequest = {
      appId,
      title: values.title.trim(),
      summary: values.summary.trim(),
    }

    try {
      const response = await submitCaseMutation.mutateAsync({ data: payload })
      const status = response.data?.status

      invalidateCaseQueries(queryClient)
      message.success(status === 'APPROVED' ? '案例已公开' : '案例已提交，等待审核')
      form.resetFields()
      onSuccess?.()
    } catch (error) {
      message.error((error as { message?: string })?.message ?? '提交案例失败')
    }
  }

  const handleCancel = () => {
    if (submitCaseMutation.isPending) {
      return
    }

    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title="提交案例"
      open={open}
      centered
      destroyOnHidden
      confirmLoading={submitCaseMutation.isPending}
      mask={{ enabled: true, closable: !submitCaseMutation.isPending }}
      keyboard={!submitCaseMutation.isPending}
      closable={!submitCaseMutation.isPending}
      onCancel={handleCancel}
      footer={
        <Flex
          justify="end"
          gap={12}
        >
          <Button
            onClick={handleCancel}
            disabled={submitCaseMutation.isPending}
            className="rounded-full"
          >
            取消
          </Button>
          <Button
            type="primary"
            loading={submitCaseMutation.isPending}
            onClick={() => void form.submit()}
            className="rounded-full px-5 shadow-none"
          >
            提交审核
          </Button>
        </Flex>
      }
    >
      <Form
        form={form}
        layout="vertical"
        colon={false}
        requiredMark={false}
        onFinish={(values) => void handleSubmit(values)}
        className="pt-2 [&_.ant-form-item]:mb-5"
      >
        <Form.Item
          name="title"
          label="案例标题"
          htmlFor="submit-case-title"
          validateFirst
          rules={[
            {
              validator: (_, value: string | undefined) => {
                if (!value?.trim()) {
                  return Promise.reject(new Error('请输入案例标题'))
                }

                return Promise.resolve()
              },
            },
            { max: 128, message: '案例标题不能超过 128 个字符' },
          ]}
        >
          <Input
            id="submit-case-title"
            maxLength={128}
            showCount
            allowClear
            placeholder="请输入案例标题"
            className="h-11 rounded-xl"
          />
        </Form.Item>

        <Form.Item
          name="summary"
          label="案例简介"
          htmlFor="submit-case-summary"
          validateFirst
          rules={[
            {
              validator: (_, value: string | undefined) => {
                if (!value?.trim()) {
                  return Promise.reject(new Error('请输入案例简介'))
                }

                return Promise.resolve()
              },
            },
            { max: 512, message: '案例简介不能超过 512 个字符' },
          ]}
        >
          <Input.TextArea
            id="submit-case-summary"
            rows={5}
            maxLength={512}
            showCount
            allowClear
            placeholder="介绍应用能力、适用场景或设计思路"
            className="rounded-2xl"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
