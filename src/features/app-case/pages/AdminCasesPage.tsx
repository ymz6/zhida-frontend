import { useListAdminCases, useUpdateAdminCase } from '@/api/generated/endpoints/admin-app-case'
import type {
  AdminAppCaseInfo,
  AdminUpdateAppCaseRequest,
  ListAdminAppCasesRequest,
  PageResultAdminAppCaseInfo,
} from '@/api/generated/models'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  Table,
  Tag,
} from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { Check, ExternalLink, FolderKanban, RotateCcw, Search, X } from 'lucide-react'
import { useState } from 'react'

import { APP_CASE_STATUS_LABELS } from '../types'
import {
  formatCaseDateTime,
  getCaseAuthorName,
  getCaseStatusColor,
  getCaseStatusLabel,
  getCaseSummary,
  getCaseTitle,
  getErrorMessage,
  invalidateCaseQueries,
  openCasePreview,
} from '../utils/case'

const DEFAULT_ADMIN_CASES_REQUEST: ListAdminAppCasesRequest = {
  pageNum: 1,
  pageSize: 10,
  status: 'PENDING',
}

const CASE_STATUS_OPTIONS = Object.entries(APP_CASE_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const FEATURED_OPTIONS = [
  { value: 'true', label: '精选' },
  { value: 'false', label: '普通' },
]

interface AdminCaseFilters {
  keyword?: string
  status?: string
  featured?: 'true' | 'false'
}

interface RejectCaseFormValues {
  reviewRemark: string
}

function getAdminCaseRowKey(record: AdminAppCaseInfo) {
  return record.id || record.appId || `${record.title}-${record.createdAt}`
}

function featuredToSelectValue(featured: boolean | undefined) {
  if (featured === true) {
    return 'true'
  }

  if (featured === false) {
    return 'false'
  }

  return undefined
}

function selectValueToFeatured(value: 'true' | 'false' | undefined) {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return undefined
}

export function AdminCasesPage() {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<AdminCaseFilters>()
  const [rejectForm] = Form.useForm<RejectCaseFormValues>()
  const [request, setRequest] = useState<ListAdminAppCasesRequest>(DEFAULT_ADMIN_CASES_REQUEST)
  const [rejectCase, setRejectCase] = useState<AdminAppCaseInfo | null>(null)
  const casesQuery = useListAdminCases<
    PageResultAdminAppCaseInfo | undefined,
    { message?: string }
  >(
    { request },
    {
      request: {
        params: request,
      },
      query: {
        placeholderData: keepPreviousData,
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const updateCaseMutation = useUpdateAdminCase()
  const pageResult = casesQuery.data
  const total = Number(pageResult?.total ?? 0)

  const updateCase = async (
    appCase: AdminAppCaseInfo,
    data: AdminUpdateAppCaseRequest,
    successMessage: string,
  ) => {
    if (!appCase.id) {
      message.error('缺少案例 ID，无法更新')
      return
    }

    try {
      await updateCaseMutation.mutateAsync({
        caseId: appCase.id,
        data,
      })
      message.success(successMessage)
      invalidateCaseQueries(queryClient)
      await casesQuery.refetch()
    } catch (error) {
      message.error((error as { message?: string })?.message ?? '案例更新失败')
    }
  }

  const handleApprove = (appCase: AdminAppCaseInfo) => {
    void updateCase(appCase, { status: 'APPROVED' }, '案例已通过审核')
  }

  const handleOpenRejectModal = (appCase: AdminAppCaseInfo) => {
    rejectForm.resetFields()
    setRejectCase(appCase)
  }

  const handleReject = async (values: RejectCaseFormValues) => {
    if (!rejectCase) {
      return
    }

    await updateCase(
      rejectCase,
      {
        status: 'REJECTED',
        reviewRemark: values.reviewRemark.trim(),
      },
      '案例已驳回',
    )
    setRejectCase(null)
    rejectForm.resetFields()
  }

  const handleOffline = (appCase: AdminAppCaseInfo) => {
    modal.confirm({
      centered: true,
      title: '确认下架案例？',
      content: '下架后案例不会继续在案例广场展示，精选状态也会被取消。',
      okText: '确认下架',
      cancelText: '取消',
      okButtonProps: {
        danger: true,
      },
      onOk: () => updateCase(appCase, { status: 'OFFLINE' }, '案例已下架'),
    })
  }

  const handleFeaturedChange = (appCase: AdminAppCaseInfo, featured: boolean) => {
    void updateCase(appCase, { featured }, featured ? '已设置为精选' : '已取消精选')
  }

  const handleFilterSubmit = (values: AdminCaseFilters) => {
    setRequest((currentRequest) => ({
      ...currentRequest,
      pageNum: 1,
      keyword: values.keyword?.trim() || undefined,
      status: values.status,
      featured: selectValueToFeatured(values.featured),
    }))
  }

  const handleReset = () => {
    form.resetFields()
    setRequest(DEFAULT_ADMIN_CASES_REQUEST)
  }

  const handleTableChange: TableProps<AdminAppCaseInfo>['onChange'] = (pagination) => {
    setRequest((currentRequest) => ({
      ...currentRequest,
      pageNum: pagination.current ?? currentRequest.pageNum,
      pageSize: pagination.pageSize ?? currentRequest.pageSize,
    }))
  }

  const columns: TableColumnsType<AdminAppCaseInfo> = [
    {
      title: '案例',
      dataIndex: 'title',
      key: 'title',
      width: 340,
      render: (_value: string, record) => {
        const title = getCaseTitle(record.title)
        const authorName = getCaseAuthorName(record.author)
        const authorInitial = authorName.trim().slice(0, 1) || '用'

        return (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              src={record.author?.avatar}
              className="shrink-0 bg-sky-100! text-sky-600!"
            >
              {authorInitial}
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{title}</p>
              <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                {getCaseSummary(record.summary)}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      title: '应用',
      dataIndex: 'appName',
      key: 'appName',
      width: 180,
      ellipsis: true,
      render: (value: string) => value || '未命名应用',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status: string) => (
        <Tag color={getCaseStatusColor(status)}>{getCaseStatusLabel(status)}</Tag>
      ),
    },
    {
      title: '精选',
      dataIndex: 'featured',
      key: 'featured',
      width: 120,
      align: 'center',
      render: (featured: boolean, record) => (
        <Switch
          checked={Boolean(featured)}
          disabled={record.status !== 'APPROVED' || updateCaseMutation.isPending}
          loading={updateCaseMutation.isPending}
          onChange={(checked) => handleFeaturedChange(record, checked)}
        />
      ),
    },
    {
      title: '审核备注',
      dataIndex: 'reviewRemark',
      key: 'reviewRemark',
      width: 260,
      ellipsis: true,
      render: (value: string) => value || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => formatCaseDateTime(value),
    },
    {
      title: '公开时间',
      dataIndex: 'reviewedAt',
      key: 'reviewedAt',
      width: 180,
      render: (value: string) => formatCaseDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      fixed: 'right',
      render: (_value, record) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="small"
            disabled={!record.previewUrl}
            icon={<ExternalLink className="size-3.5" />}
            onClick={() => openCasePreview(record.previewUrl)}
          >
            预览
          </Button>
          {record.status === 'PENDING' ? (
            <>
              <Button
                size="small"
                type="primary"
                loading={updateCaseMutation.isPending}
                icon={<Check className="size-3.5" />}
                onClick={() => handleApprove(record)}
              >
                通过
              </Button>
              <Button
                size="small"
                danger
                icon={<X className="size-3.5" />}
                onClick={() => handleOpenRejectModal(record)}
              >
                驳回
              </Button>
            </>
          ) : null}
          {record.status === 'APPROVED' ? (
            <Button
              size="small"
              danger
              loading={updateCaseMutation.isPending}
              onClick={() => handleOffline(record)}
            >
              下架
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-[1680px] space-y-6">
      <Card className="rounded-xl border-slate-200/60 bg-white shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FolderKanban className="size-5" />
          </div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-slate-950">案例管理</h1>
        </div>

        <Form
          form={form}
          layout="vertical"
          colon={false}
          requiredMark={false}
          initialValues={{
            keyword: request.keyword,
            status: request.status,
            featured: featuredToSelectValue(request.featured),
          }}
          onFinish={handleFilterSubmit}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]"
        >
          <Form.Item
            name="keyword"
            label="关键词"
            className="mb-0!"
          >
            <Input
              allowClear
              placeholder="搜索标题、简介、应用名"
              className="h-11 rounded-xl"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            className="mb-0!"
          >
            <Select
              allowClear
              placeholder="全部状态"
              options={CASE_STATUS_OPTIONS}
              className="h-11"
            />
          </Form.Item>

          <Form.Item
            name="featured"
            label="精选"
            htmlFor="admin-cases-featured"
            className="mb-0!"
          >
            <Select
              id="admin-cases-featured"
              allowClear
              placeholder="全部"
              options={FEATURED_OPTIONS}
              className="h-11"
            />
          </Form.Item>

          <div className="flex items-end">
            <div className="flex gap-2 pb-0.5">
              <Button
                type="primary"
                htmlType="submit"
                icon={<Search className="size-4" />}
                className="h-11 rounded-xl"
              >
                查询
              </Button>
              <Button
                icon={<RotateCcw className="size-4" />}
                onClick={handleReset}
                className="h-11 rounded-xl"
              >
                重置
              </Button>
            </div>
          </div>
        </Form>
      </Card>

      {casesQuery.isError ? (
        <Alert
          showIcon
          type="error"
          title={getErrorMessage(casesQuery.error, '案例列表加载失败，请稍后重试')}
        />
      ) : null}

      <Card
        className="rounded-xl border-slate-200/60 bg-white shadow-sm"
        classNames={{ body: 'p-0!' }}
      >
        <Table
          rowKey={getAdminCaseRowKey}
          columns={columns}
          dataSource={pageResult?.list ?? []}
          loading={casesQuery.isFetching}
          tableLayout="fixed"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无案例"
              />
            ),
          }}
          pagination={{
            current: pageResult?.pageNum ?? request.pageNum,
            pageSize: pageResult?.pageSize ?? request.pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 1680 }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title="驳回案例"
        open={Boolean(rejectCase)}
        centered
        destroyOnHidden
        confirmLoading={updateCaseMutation.isPending}
        mask={{ enabled: true, closable: !updateCaseMutation.isPending }}
        keyboard={!updateCaseMutation.isPending}
        closable={!updateCaseMutation.isPending}
        onCancel={() => {
          if (updateCaseMutation.isPending) {
            return
          }

          setRejectCase(null)
          rejectForm.resetFields()
        }}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              disabled={updateCaseMutation.isPending}
              onClick={() => {
                setRejectCase(null)
                rejectForm.resetFields()
              }}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              danger
              type="primary"
              loading={updateCaseMutation.isPending}
              onClick={() => void rejectForm.submit()}
              className="rounded-full px-5 shadow-none"
            >
              确认驳回
            </Button>
          </div>
        }
      >
        <Form
          form={rejectForm}
          layout="vertical"
          colon={false}
          requiredMark={false}
          onFinish={(values) => void handleReject(values)}
          className="pt-2"
        >
          <Form.Item
            name="reviewRemark"
            label="驳回原因"
            htmlFor="reject-case-review-remark"
            validateFirst
            rules={[
              {
                validator: (_, value: string | undefined) => {
                  if (!value?.trim()) {
                    return Promise.reject(new Error('请输入驳回原因'))
                  }

                  return Promise.resolve()
                },
              },
              { max: 512, message: '驳回原因不能超过 512 个字符' },
            ]}
          >
            <Input.TextArea
              id="reject-case-review-remark"
              rows={5}
              maxLength={512}
              showCount
              allowClear
              placeholder="说明不通过的原因，便于用户调整后重新提交"
              className="rounded-2xl"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
