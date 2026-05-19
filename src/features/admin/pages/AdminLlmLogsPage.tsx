import {
  useGetLlmLogOverview,
  useListLlmLogs,
} from '@/api/generated/endpoints/admin-llm-log'
import type {
  ListLlmLogsRequest,
  LlmLogOverviewVO,
  LlmLogVO,
  PageResultLlmLogVO,
} from '@/api/generated/models'
import { keepPreviousData } from '@tanstack/react-query'
import { Alert, Button, Card, DatePicker, Empty, Statistic, Table, Tag, Tooltip } from 'antd'
import type { TableProps } from 'antd'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Gauge,
  Hash,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

const { RangePicker } = DatePicker

const PAGE_SIZE = 10
const DISPLAY_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
const API_DATE_TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss'

type LlmLogPickerRange = [Dayjs | null | undefined, Dayjs | null | undefined] | null
type LlmLogTimeRange = readonly [Dayjs | null | undefined, Dayjs | null | undefined] | null

export function buildLlmLogTimeRequest(range: LlmLogTimeRange): Pick<
  ListLlmLogsRequest,
  'startTime' | 'endTime'
> {
  const [startTime, endTime] = range ?? []

  if (!startTime || !endTime) {
    return {}
  }

  return {
    startTime: startTime.format(API_DATE_TIME_FORMAT),
    endTime: endTime.format(API_DATE_TIME_FORMAT),
  }
}

export function formatTokenCount(value?: string | number) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return '-'
  }

  return new Intl.NumberFormat('zh-CN').format(numericValue)
}

export function formatDurationMillis(value?: string | number) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return '-'
  }

  if (numericValue < 1000) {
    return `${numericValue} ms`
  }

  return `${(numericValue / 1000).toFixed(2).replace(/\.?0+$/, '')} s`
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

function toFiniteNumber(value?: string | number) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function formatFailureRate(overview?: LlmLogOverviewVO) {
  const totalCalls = toFiniteNumber(overview?.totalCalls)
  const failedCalls = toFiniteNumber(overview?.failedCalls)

  if (totalCalls && failedCalls !== undefined) {
    return `${((failedCalls / totalCalls) * 100).toFixed(1).replace(/\.0$/, '')}%`
  }

  if (overview?.successRate !== undefined) {
    const successRate = overview.successRate <= 1 ? overview.successRate * 100 : overview.successRate
    return `${Math.max(0, 100 - successRate)
      .toFixed(1)
      .replace(/\.0$/, '')}%`
  }

  return '-'
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }

  const parsedValue = dayjs(value)

  return parsedValue.isValid() ? parsedValue.format(DISPLAY_DATE_TIME_FORMAT) : value
}

function renderStatusTag(status?: string) {
  const normalizedStatus = status?.toLowerCase()

  if (normalizedStatus === 'success' || normalizedStatus === 'succeeded') {
    return (
      <Tag
        color="green"
        className="m-0"
      >
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <CheckCircle2 className="size-3 shrink-0" />
          成功
        </span>
      </Tag>
    )
  }

  if (normalizedStatus === 'failed' || normalizedStatus === 'fail' || normalizedStatus === 'error') {
    return (
      <Tag
        color="red"
        className="m-0"
      >
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <XCircle className="size-3 shrink-0" />
          失败
        </span>
      </Tag>
    )
  }

  return (
    <Tag className="m-0">
      <span className="whitespace-nowrap">{status || '未知'}</span>
    </Tag>
  )
}

function renderErrorMessage(errorMessage?: string, status?: string) {
  if (errorMessage) {
    return (
      <Tooltip title={errorMessage}>
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
          <CircleAlert className="size-3.5 shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </span>
      </Tooltip>
    )
  }

  const normalizedStatus = status?.toLowerCase()

  if (normalizedStatus === 'failed' || normalizedStatus === 'fail' || normalizedStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600">
        <CircleAlert className="size-3.5 shrink-0" />
        未返回错误详情
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <CheckCircle2 className="size-3.5 shrink-0" />
      无错误
    </span>
  )
}

function renderMutedText(value?: ReactNode) {
  return value || <span className="text-slate-400">-</span>
}

export function AdminLlmLogsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [overviewTimeRange, setOverviewTimeRange] = useState<LlmLogPickerRange>([
    dayjs().subtract(6, 'day').startOf('day'),
    dayjs().endOf('day'),
  ])
  const [logsTimeRange, setLogsTimeRange] = useState<LlmLogPickerRange>([
    dayjs().subtract(6, 'day').startOf('day'),
    dayjs().endOf('day'),
  ])
  const overviewTimeRequest = buildLlmLogTimeRequest(overviewTimeRange)
  const logsTimeRequest = buildLlmLogTimeRequest(logsTimeRange)
  const overviewParams = { request: overviewTimeRequest }
  const listRequest: ListLlmLogsRequest = {
    ...logsTimeRequest,
    pageNum: currentPage,
    pageSize,
  }
  const listParams = { request: listRequest }
  const overviewQuery = useGetLlmLogOverview<LlmLogOverviewVO | undefined, { message?: string }>(
    overviewParams,
    {
      request: {
        params: overviewTimeRequest,
      },
      query: {
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const logsQuery = useListLlmLogs<PageResultLlmLogVO | undefined, { message?: string }>(
    listParams,
    {
      request: {
        params: listRequest,
      },
      query: {
        placeholderData: keepPreviousData,
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const overview = overviewQuery.data
  const pageResult = logsQuery.data
  const logs = pageResult?.list ?? []
  const total = Number(pageResult?.total ?? 0)

  const metricCards = [
    {
      title: '总调用量',
      value: formatTokenCount(overview?.totalCalls),
      icon: <Hash className="size-4" />,
      helper: `${formatTokenCount(overview?.successCalls)} 成功`,
    },
    {
      title: '总 Token',
      value: formatTokenCount(overview?.totalTokens),
      icon: <Bot className="size-4" />,
      helper: `输入 ${formatTokenCount(overview?.inputTokens)} / 输出 ${formatTokenCount(
        overview?.outputTokens,
      )}`,
    },
    {
      title: '平均耗时',
      value: formatDurationMillis(overview?.averageDurationMillis),
      icon: <Clock3 className="size-4" />,
      helper: '按当前时间范围统计',
    },
    {
      title: '失败率',
      value: formatFailureRate(overview),
      icon: <Gauge className="size-4" />,
      helper: `${formatTokenCount(overview?.failedCalls)} 次失败`,
    },
  ]

  const columns: TableProps<LlmLogVO>['columns'] = [
    {
      title: '请求 ID',
      dataIndex: 'id',
      width: 96,
      render: (value?: string) => (
        <Tooltip title={value}>
          <span className="block max-w-16 truncate font-mono text-xs text-slate-500">
            {value || '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '模型',
      dataIndex: 'modelName',
      width: 170,
      render: (value?: string) => (
        <Tag
          color="blue"
          className="m-0 max-w-36 truncate align-middle"
        >
          {value || '-'}
        </Tag>
      ),
    },
    {
      title: '用户 ID',
      dataIndex: 'userId',
      width: 96,
      align: 'center',
      render: (value?: string) => renderMutedText(value),
    },
    {
      title: '调用时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: 'Token',
      width: 220,
      render: (_, record) => (
        <div className="leading-5">
          <div className="font-medium text-slate-900">{formatTokenCount(record.totalTokens)}</div>
          <div className="text-xs text-slate-500">
            输入 {formatTokenCount(record.inputTokens)} / 输出 {formatTokenCount(record.outputTokens)}
          </div>
        </div>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'durationMillis',
      width: 96,
      render: (value?: string) => formatDurationMillis(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 104,
      render: renderStatusTag,
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      width: 320,
      render: (value: string | undefined, record) => renderErrorMessage(value, record.status),
    },
  ]

  return (
    <main className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-slate-950">LLM调用明细</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            查看模型调用量、Token 消耗、耗时与失败情况
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <RangePicker
            showTime
            value={overviewTimeRange}
            format={DISPLAY_DATE_TIME_FORMAT}
            allowClear
            onChange={setOverviewTimeRange}
            className="w-full rounded-lg! sm:w-96"
          />
          <Button
            icon={<RefreshCw className="size-4" />}
            loading={overviewQuery.isFetching}
            onClick={() => void overviewQuery.refetch()}
            className="rounded-lg"
          >
            刷新概览
          </Button>
        </div>
      </header>

      {overviewQuery.isError ? (
        <Alert
          showIcon
          type="error"
          title="统计概览加载失败"
          description={getErrorMessage(overviewQuery.error, '请稍后重试。')}
          action={
            <Button
              size="small"
              onClick={() => void overviewQuery.refetch()}
            >
              重试
            </Button>
          }
          className="rounded-xl"
        />
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <Card
            key={metric.title}
            className="rounded-xl border-slate-200/70 bg-white shadow-sm"
            loading={overviewQuery.isPending}
          >
            <div className="flex items-start justify-between gap-4">
              <Statistic
                title={<span className="text-sm text-slate-500">{metric.title}</span>}
                value={metric.value}
                styles={{
                  content: {
                    color: '#0f172a',
                    fontSize: 26,
                    fontWeight: 700,
                  },
                }}
              />
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                {metric.icon}
              </span>
            </div>
            <p className="m-0 mt-3 text-xs text-slate-500">{metric.helper}</p>
          </Card>
        ))}
      </section>

      <Card
        title="调用明细"
        className="rounded-xl border-slate-200/70 bg-white shadow-sm"
        extra={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <RangePicker
              showTime
              value={logsTimeRange}
              format={DISPLAY_DATE_TIME_FORMAT}
              allowClear
              onChange={(nextRange) => {
                setLogsTimeRange(nextRange)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg! lg:w-96"
            />
            <Button
              icon={<RefreshCw className="size-4" />}
              loading={logsQuery.isFetching}
              onClick={() => void logsQuery.refetch()}
              className="rounded-lg"
            >
              刷新明细
            </Button>
            <span className="whitespace-nowrap text-sm text-slate-500">
              共 <span className="font-medium text-slate-900">{formatTokenCount(total)}</span> 条
            </span>
          </div>
        }
      >
        {logsQuery.isError ? (
          <Alert
            showIcon
            type="error"
            title="调用明细加载失败"
            description={getErrorMessage(logsQuery.error, '请稍后重试。')}
            action={
              <Button
                size="small"
                onClick={() => void logsQuery.refetch()}
              >
                重试
              </Button>
            }
            className="rounded-xl"
          />
        ) : (
          <Table<LlmLogVO>
            rowKey={(record) =>
              record.id ?? `${record.createdAt ?? 'time'}-${record.modelName ?? 'model'}`
            }
            size="medium"
            tableLayout="fixed"
            columns={columns}
            dataSource={logs}
            loading={logsQuery.isPending || logsQuery.isFetching}
            scroll={{ x: 1180 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无调用记录"
                />
              ),
            }}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              showTotal: (itemTotal) => `共 ${formatTokenCount(itemTotal)} 条`,
            }}
            onChange={(pagination) => {
              const nextPageSize = pagination.pageSize ?? pageSize
              setPageSize(nextPageSize)
              setCurrentPage(nextPageSize === pageSize ? pagination.current ?? 1 : 1)
            }}
          />
        )}
      </Card>
    </main>
  )
}
