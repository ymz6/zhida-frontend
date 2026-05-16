import { useListMyCases } from '@/api/generated/endpoints/app-case'
import type {
  ListMyAppCasesRequest,
  MyAppCaseInfo,
  PageResultMyAppCaseInfo,
} from '@/api/generated/models'
import { keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Avatar, Button, Card, Empty, Select, Table, Tag } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { ExternalLink, FileClock, RotateCcw, Search } from 'lucide-react'
import { useState } from 'react'

import { SubmitCaseModal } from '../components/SubmitCaseModal'
import { APP_CASE_STATUS_LABELS } from '../types'
import {
  canResubmitCase,
  formatCaseDateTime,
  getCaseAuthorName,
  getCaseStatusColor,
  getCaseStatusLabel,
  getCaseSummary,
  getCaseTitle,
  getErrorMessage,
  openCasePreview,
} from '../utils/case'

const DEFAULT_MY_CASES_REQUEST: ListMyAppCasesRequest = {
  pageNum: 1,
  pageSize: 10,
}

const CASE_STATUS_OPTIONS = Object.entries(APP_CASE_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

function getMyCaseRowKey(record: MyAppCaseInfo) {
  return record.id || record.appId || `${record.title}-${record.createdAt}`
}

/**
 * @deprecated 旧“我的投稿”页面已废弃，仅为渐进移除保留。
 */
export function MyCasesPage() {
  const navigate = useNavigate()
  const [request, setRequest] = useState<ListMyAppCasesRequest>(DEFAULT_MY_CASES_REQUEST)
  const [resubmitCase, setResubmitCase] = useState<MyAppCaseInfo | null>(null)
  const casesQuery = useListMyCases<PageResultMyAppCaseInfo | undefined, { message?: string }>(
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
  const pageResult = casesQuery.data
  const total = Number(pageResult?.total ?? 0)

  const handleTableChange: TableProps<MyAppCaseInfo>['onChange'] = (pagination) => {
    setRequest((currentRequest) => ({
      ...currentRequest,
      pageNum: pagination.current ?? currentRequest.pageNum,
      pageSize: pagination.pageSize ?? currentRequest.pageSize,
    }))
  }

  const columns: TableColumnsType<MyAppCaseInfo> = [
    {
      title: '案例',
      dataIndex: 'title',
      key: 'title',
      width: 320,
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
      width: 100,
      align: 'center',
      render: (featured: boolean) => (featured ? <Tag color="gold">精选</Tag> : <Tag>普通</Tag>),
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
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (value: string) => formatCaseDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
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
          {record.status === 'APPROVED' && record.id ? (
            <Button
              size="small"
              type="primary"
              onClick={() =>
                void navigate({
                  to: '/cases',
                })
              }
            >
              查看公开页
            </Button>
          ) : null}
          {canResubmitCase(record.status) ? (
            <Button
              size="small"
              onClick={() => setResubmitCase(record)}
            >
              重新提交
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <main className="space-y-6">
      <Card className="rounded-3xl border-slate-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <FileClock className="size-5" />
              </div>
              <h1 className="m-0 text-3xl font-semibold tracking-tight text-slate-950">我的投稿</h1>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              查看已提交案例的审核状态和处理结果。
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <Select
              allowClear
              value={request.status}
              placeholder="全部状态"
              options={CASE_STATUS_OPTIONS}
              onChange={(status) =>
                setRequest((currentRequest) => ({
                  ...currentRequest,
                  pageNum: 1,
                  status,
                }))
              }
              className="h-11 min-w-44"
            />
            <Button
              type="primary"
              icon={<Search className="size-4" />}
              onClick={() => void casesQuery.refetch()}
              className="h-11 rounded-xl px-5!"
            >
              查询
            </Button>
            <Button
              icon={<RotateCcw className="size-4" />}
              onClick={() => setRequest(DEFAULT_MY_CASES_REQUEST)}
              className="h-11 rounded-xl px-5!"
            >
              重置
            </Button>
          </div>
        </div>
      </Card>

      {casesQuery.isError ? (
        <Alert
          showIcon
          type="error"
          title={getErrorMessage(casesQuery.error, '我的投稿加载失败，请稍后重试')}
        />
      ) : null}

      <Card
        className="rounded-3xl border-slate-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
        classNames={{ body: 'p-0!' }}
      >
        <Table
          rowKey={getMyCaseRowKey}
          columns={columns}
          dataSource={pageResult?.list ?? []}
          loading={casesQuery.isFetching}
          tableLayout="fixed"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无投稿"
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
          scroll={{ x: 1420 }}
          onChange={handleTableChange}
        />
      </Card>

      <SubmitCaseModal
        open={Boolean(resubmitCase)}
        appId={resubmitCase?.appId}
        initialTitle={resubmitCase?.title}
        initialSummary={resubmitCase?.summary}
        onCancel={() => setResubmitCase(null)}
        onSuccess={() => {
          setResubmitCase(null)
          void casesQuery.refetch()
        }}
      />
    </main>
  )
}
