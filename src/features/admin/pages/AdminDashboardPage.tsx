import {
  useGetLlmMonitoringOverview,
  useGetLlmTokenUsageTrend,
  useListLlmCalls,
} from '@/api/generated/endpoints/admin-monitoring'
import type {
  GetLlmMonitoringOverviewParams,
  GetLlmTokenUsageTrendParams,
  ListLlmCallsParams,
  ListLlmCallsRequest,
  LlmCallLogInfo,
  LlmMonitoringOverview,
  LlmTokenUsageTrend,
  LlmTokenUsageTrendSeries,
  PageResultLlmCallLogInfo,
} from '@/api/generated/models'
import { Line } from '@ant-design/plots'
import type { LineConfig } from '@ant-design/plots'
import { keepPreviousData } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  Activity,
  BarChart3,
  Clock,
  Database,
  Eye,
  Gauge,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  TriangleAlert,
  Zap,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

const { RangePicker } = DatePicker
const { Paragraph, Text, Title } = Typography

const MONITORING_TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss'
const DATE_TIME_DISPLAY_FORMAT = 'YYYY-MM-DD HH:mm:ss'
const DEFAULT_PAGE_SIZE = 10

type NumberLike = number | string | null | undefined

interface LlmCallFilterValues {
  scenario?: string
  modelName?: string
  status?: string
  finishReason?: string
  errorType?: string
  appId?: string
  taskId?: string
}

interface OverviewMetric {
  key: string
  title: string
  value: string
  hint: string
  icon: ReactNode
  iconClassName: string
}

interface TrendPoint {
  time: string
  type: string
  value: number
}

const LLM_STATUS_OPTIONS = [
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
]

const TOKEN_SERIES_LABELS: Record<string, string> = {
  inputTokens: '输入 Tokens',
  outputTokens: '输出 Tokens',
  totalTokens: '总 Tokens',
}

function createDefaultRange(): [Dayjs, Dayjs] {
  return [dayjs().subtract(7, 'day'), dayjs()]
}

function toRangeParams(range: [Dayjs, Dayjs]) {
  return {
    startTime: range[0].format(MONITORING_TIME_FORMAT),
    endTime: range[1].format(MONITORING_TIME_FORMAT),
  }
}

function toNumber(value: NumberLike) {
  if (value == null || value === '') {
    return undefined
  }

  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : undefined
}

function trimToUndefined(value?: string | null) {
  const trimmed = value?.trim()

  return trimmed || undefined
}

function formatNumber(value: NumberLike, maximumFractionDigits = 2) {
  const numberValue = toNumber(value)

  if (numberValue == null) {
    return '-'
  }

  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits,
  }).format(numberValue)
}

function formatRatio(value: NumberLike) {
  const numberValue = toNumber(value)

  if (numberValue == null) {
    return '-'
  }

  return `${formatNumber(numberValue * 100, 2)}%`
}

function formatDuration(value: NumberLike) {
  const numberValue = toNumber(value)

  if (numberValue == null) {
    return '-'
  }

  return `${formatNumber(numberValue, 0)} ms`
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const parsed = dayjs(value)

  return parsed.isValid() ? parsed.format(DATE_TIME_DISPLAY_FORMAT) : value
}

function formatChartTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const parsed = dayjs(value)

  return parsed.isValid() ? parsed.format('MM-DD HH:mm') : value
}

function displayText(value?: string | number | null) {
  if (value == null || value === '') {
    return '-'
  }

  return String(value)
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const rawErrorMessage = (error as { message?: unknown }).message

    if (typeof rawErrorMessage === 'string' && rawErrorMessage) {
      return rawErrorMessage
    }
  }

  return '请求失败，请稍后重试'
}

function getStatusTag(status?: string) {
  if (status === 'SUCCESS') {
    return <Tag color="green">SUCCESS</Tag>
  }

  if (status === 'FAILED') {
    return <Tag color="red">FAILED</Tag>
  }

  return <Tag>{status || '-'}</Tag>
}

function buildTokenTrendData(trend?: LlmTokenUsageTrend): TrendPoint[] {
  return (trend?.series ?? []).flatMap((series) => toTrendPoints(series))
}

function toTrendPoints(series: LlmTokenUsageTrendSeries): TrendPoint[] {
  return (series.points ?? [])
    .filter((point) => typeof point.value === 'number' && point.time)
    .map((point) => ({
      time: formatChartTime(point.time),
      type: TOKEN_SERIES_LABELS[series.name ?? ''] ?? series.name ?? '指标',
      value: point.value as number,
    }))
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="border-b border-slate-100 pb-2">
        <Text className="text-sm font-semibold text-slate-900">{title}</Text>
      </div>
      {children}
    </section>
  )
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <Text className="mb-1 block text-xs font-medium text-slate-500">{label}</Text>
      <div className="min-w-0 break-words text-sm text-slate-900">{children}</div>
    </div>
  )
}

export function AdminDashboardPage() {
  const [filterForm] = Form.useForm<LlmCallFilterValues>()
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => createDefaultRange())
  const [callSearch, setCallSearch] = useState<ListLlmCallsRequest>({
    pageNum: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  })
  const [selectedCall, setSelectedCall] = useState<LlmCallLogInfo>()

  const rangeParams = toRangeParams(range)
  const overviewParams: GetLlmMonitoringOverviewParams = { request: rangeParams }
  const trendParams: GetLlmTokenUsageTrendParams = { request: rangeParams }
  const listRequest: ListLlmCallsRequest = {
    ...callSearch,
    ...rangeParams,
  }
  const listParams: ListLlmCallsParams = { request: listRequest }

  const overviewQuery = useGetLlmMonitoringOverview<
    LlmMonitoringOverview | undefined,
    { message?: string }
  >(overviewParams, {
    request: {
      // orval 生成类型包了一层 request，实际接口需要扁平 query 参数。
      params: rangeParams,
    },
    query: {
      select: (response) => response.data,
      retry: false,
    },
  })
  const trendQuery = useGetLlmTokenUsageTrend<LlmTokenUsageTrend | undefined, { message?: string }>(
    trendParams,
    {
      request: {
        // stepSeconds 由后端按时间范围自动计算，前端不额外传递。
        params: rangeParams,
      },
      query: {
        select: (response) => response.data,
        retry: false,
      },
    },
  )
  const callsQuery = useListLlmCalls<PageResultLlmCallLogInfo | undefined, { message?: string }>(
    listParams,
    {
      request: {
        // 明细接口同样走扁平参数，避免发送 request[startTime] 这类嵌套字段。
        params: listRequest,
      },
      query: {
        placeholderData: keepPreviousData,
        select: (response) => response.data,
        retry: false,
      },
    },
  )

  const overview = overviewQuery.data
  const tokenTrendData = buildTokenTrendData(trendQuery.data)
  const pageResult = callsQuery.data
  const total = Number(pageResult?.total ?? 0)
  const isRefreshing = overviewQuery.isFetching || trendQuery.isFetching || callsQuery.isFetching
  const errorMessage = overviewQuery.isError
    ? getErrorMessage(overviewQuery.error)
    : trendQuery.isError
      ? getErrorMessage(trendQuery.error)
      : callsQuery.isError
        ? getErrorMessage(callsQuery.error)
        : undefined

  const overviewMetrics: OverviewMetric[] = [
    {
      key: 'callTotal',
      title: '调用总数',
      value: formatNumber(overview?.callTotal, 0),
      hint: '当前时间范围内的 LLM 请求量',
      icon: <Activity className="size-5" />,
      iconClassName: 'bg-blue-50 text-blue-600',
    },
    {
      key: 'successRate',
      title: '成功率',
      value: formatRatio(overview?.successRate),
      hint: '成功调用占比',
      icon: <Gauge className="size-5" />,
      iconClassName: 'bg-emerald-50 text-emerald-600',
    },
    {
      key: 'averageDurationMillis',
      title: '平均耗时',
      value: formatDuration(overview?.averageDurationMillis),
      hint: '单次调用平均响应时间',
      icon: <Clock className="size-5" />,
      iconClassName: 'bg-amber-50 text-amber-600',
    },
    {
      key: 'inputTokens',
      title: '输入 Tokens',
      value: formatNumber(overview?.inputTokens, 0),
      hint: 'LangChain4j inputTokenCount 汇总',
      icon: <Database className="size-5" />,
      iconClassName: 'bg-cyan-50 text-cyan-600',
    },
    {
      key: 'outputTokens',
      title: '输出 Tokens',
      value: formatNumber(overview?.outputTokens, 0),
      hint: 'LangChain4j outputTokenCount 汇总',
      icon: <Sparkles className="size-5" />,
      iconClassName: 'bg-violet-50 text-violet-600',
    },
    {
      key: 'totalTokens',
      title: '总 Tokens',
      value: formatNumber(overview?.totalTokens, 0),
      hint: '输入与输出 token 合计',
      icon: <Zap className="size-5" />,
      iconClassName: 'bg-indigo-50 text-indigo-600',
    },
    {
      key: 'errorCount',
      title: '错误次数',
      value: formatNumber(overview?.errorCount, 0),
      hint: '失败调用数量',
      icon: <TriangleAlert className="size-5" />,
      iconClassName: 'bg-rose-50 text-rose-600',
    },
  ]

  const lineConfig: LineConfig = {
    data: tokenTrendData,
    xField: 'time',
    yField: 'value',
    colorField: 'type',
    height: 260,
    autoFit: true,
  }

  const handleRangeChange = (dates: null | [Dayjs | null, Dayjs | null]) => {
    if (!dates?.[0] || !dates?.[1]) {
      return
    }

    setRange([dates[0], dates[1]])
    setCallSearch((current) => ({
      ...current,
      pageNum: 1,
    }))
  }

  const handleFilterSubmit = (values: LlmCallFilterValues) => {
    setCallSearch((current) => ({
      pageNum: 1,
      pageSize: current.pageSize,
      scenario: trimToUndefined(values.scenario),
      modelName: trimToUndefined(values.modelName),
      status: trimToUndefined(values.status),
      finishReason: trimToUndefined(values.finishReason),
      errorType: trimToUndefined(values.errorType),
      appId: trimToUndefined(values.appId),
      taskId: trimToUndefined(values.taskId),
    }))
  }

  const handleFilterReset = () => {
    filterForm.resetFields()
    setCallSearch((current) => ({
      pageNum: 1,
      pageSize: current.pageSize,
    }))
  }

  const handleTableChange: TableProps<LlmCallLogInfo>['onChange'] = (pagination) => {
    const nextPageSize = pagination.pageSize ?? callSearch.pageSize ?? DEFAULT_PAGE_SIZE
    const nextPageNum =
      nextPageSize !== callSearch.pageSize ? 1 : (pagination.current ?? callSearch.pageNum ?? 1)

    setCallSearch((current) => ({
      ...current,
      pageNum: nextPageNum,
      pageSize: nextPageSize,
    }))
  }

  const handleRefresh = () => {
    void overviewQuery.refetch()
    void trendQuery.refetch()
    void callsQuery.refetch()
  }

  const columns: TableColumnsType<LlmCallLogInfo> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (value: string) => displayText(value),
    },
    {
      title: '调用时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '场景',
      dataIndex: 'scenario',
      key: 'scenario',
      width: 220,
      ellipsis: true,
      render: (value: string) => displayText(value),
    },
    {
      title: '模型',
      dataIndex: 'modelName',
      key: 'modelName',
      width: 220,
      ellipsis: true,
      render: (value: string | null) => displayText(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (value: string) => getStatusTag(value),
    },
    {
      title: '停止原因',
      dataIndex: 'finishReason',
      key: 'finishReason',
      width: 140,
      render: (value: string | null) => displayText(value),
    },
    {
      title: '输入 Tokens',
      dataIndex: 'inputTokens',
      key: 'inputTokens',
      width: 130,
      align: 'right',
      render: (value: string | null) => formatNumber(value, 0),
    },
    {
      title: '输出 Tokens',
      dataIndex: 'outputTokens',
      key: 'outputTokens',
      width: 130,
      align: 'right',
      render: (value: string | null) => formatNumber(value, 0),
    },
    {
      title: '总 Tokens',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      width: 130,
      align: 'right',
      render: (value: string | null) => formatNumber(value, 0),
    },
    {
      title: '耗时',
      dataIndex: 'durationMillis',
      key: 'durationMillis',
      width: 120,
      align: 'right',
      render: (value: string | null) => formatDuration(value),
    },
    {
      title: '应用 ID',
      dataIndex: 'appId',
      key: 'appId',
      width: 110,
      render: (value: string | null) => displayText(value),
    },
    {
      title: '任务 ID',
      dataIndex: 'taskId',
      key: 'taskId',
      width: 110,
      render: (value: string | null) => displayText(value),
    },
    {
      title: '错误类型',
      dataIndex: 'errorType',
      key: 'errorType',
      width: 200,
      ellipsis: true,
      render: (value: string | null) => displayText(value),
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      fixed: 'right',
      render: (_value, record) => (
        <Button
          type="link"
          icon={<Eye className="size-4" />}
          onClick={() => setSelectedCall(record)}
          className="px-0!"
        >
          详情
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-420 space-y-6">
      <div className="rounded-lg border border-slate-200/70 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Sparkles className="size-5" />
            </div>
            <div>
              <Title
                level={3}
                className="mb-1! text-[24px]!"
              >
                LLM 调用监控
              </Title>
              <Paragraph className="mb-0! text-sm text-slate-500">
                {formatDateTime(rangeParams.startTime)} 至 {formatDateTime(rangeParams.endTime)}
              </Paragraph>
            </div>
          </div>

          <Space
            wrap
            className="justify-start xl:justify-end"
          >
            <RangePicker
              showTime
              allowClear={false}
              inputReadOnly
              value={range}
              format={DATE_TIME_DISPLAY_FORMAT}
              presets={[
                {
                  label: '最近 3 小时',
                  value: [dayjs().subtract(3, 'hour'), dayjs()],
                },
                {
                  label: '最近 24 小时',
                  value: [dayjs().subtract(1, 'day'), dayjs()],
                },
                {
                  label: '最近 7 天',
                  value: [dayjs().subtract(7, 'day'), dayjs()],
                },
                {
                  label: '最近 30 天',
                  value: [dayjs().subtract(30, 'day'), dayjs()],
                },
              ]}
              onChange={handleRangeChange}
              className="h-10 w-full min-w-72 md:w-auto"
            />
            <Button
              icon={<RefreshCw className="size-4" />}
              loading={isRefreshing}
              onClick={handleRefresh}
              className="h-10 rounded-lg"
            >
              刷新
            </Button>
          </Space>
        </div>
      </div>

      {errorMessage ? (
        <Alert
          showIcon
          type="error"
          title={errorMessage}
        />
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center rounded-lg bg-blue-50 p-1.5 text-blue-600">
            <Activity className="size-4" />
          </div>
          <Text className="text-base font-semibold text-slate-900">概览</Text>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewMetrics.map((metric) => (
            <Card
              key={metric.key}
              loading={overviewQuery.isLoading}
              className="h-full rounded-lg border border-slate-200/70 bg-white shadow-sm"
              classNames={{
                body: 'p-5!',
              }}
            >
              <div className="flex min-h-30 flex-col justify-between gap-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Text className="block text-sm font-medium text-slate-500">{metric.title}</Text>
                    <div className="mt-3 break-words text-[28px] font-semibold leading-none text-slate-950">
                      {metric.value}
                    </div>
                  </div>
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${metric.iconClassName}`}
                  >
                    {metric.icon}
                  </div>
                </div>
                <Text className="text-xs text-slate-500">{metric.hint}</Text>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center rounded-lg bg-cyan-50 p-1.5 text-cyan-600">
            <BarChart3 className="size-4" />
          </div>
          <Text className="text-base font-semibold text-slate-900">Token 用量趋势</Text>
        </div>

        <Card
          loading={trendQuery.isLoading}
          className="rounded-lg border border-slate-200/70 bg-white shadow-sm"
          classNames={{
            body: 'h-full p-5!',
          }}
        >
          <div className="min-h-84">
            {tokenTrendData.length > 0 ? (
              <Line {...lineConfig} />
            ) : (
              <div className="flex h-64 items-center justify-center">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无 Token 用量趋势"
                />
              </div>
            )}
          </div>
        </Card>
      </section>

      <Card
        className="rounded-lg border border-slate-200/70 bg-white shadow-sm"
        classNames={{
          body: 'p-5!',
        }}
      >
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex items-center justify-center rounded-lg bg-slate-100 p-1.5 text-slate-700">
            <Database className="size-4" />
          </div>
          <Text className="text-base font-semibold text-slate-900">LLM 调用明细</Text>
        </div>

        <Form
          form={filterForm}
          layout="vertical"
          colon={false}
          requiredMark={false}
          onFinish={handleFilterSubmit}
          className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8"
        >
          <Form.Item
            name="scenario"
            label="调用场景"
            className="mb-0!"
          >
            <Input
              allowClear
              placeholder="场景名称"
              className="h-10"
            />
          </Form.Item>

          <Form.Item
            name="modelName"
            label="模型"
            className="mb-0!"
          >
            <Input
              allowClear
              placeholder="模型名称"
              className="h-10"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            className="mb-0!"
          >
            <Select
              allowClear
              options={LLM_STATUS_OPTIONS}
              placeholder="全部状态"
              className="h-10"
            />
          </Form.Item>

          <Form.Item
            name="finishReason"
            label="停止原因"
            className="mb-0!"
          >
            <Input
              allowClear
              placeholder="如 STOP"
              className="h-10"
            />
          </Form.Item>

          <Form.Item
            name="errorType"
            label="错误类型"
            className="mb-0!"
          >
            <Input
              allowClear
              placeholder="异常类名"
              className="h-10"
            />
          </Form.Item>

          <Form.Item
            name="appId"
            label="应用 ID"
            className="mb-0!"
          >
            <Input
              allowClear
              placeholder="应用 ID"
              className="h-10"
            />
          </Form.Item>

          <Form.Item
            name="taskId"
            label="任务 ID"
            className="mb-0!"
          >
            <Input
              allowClear
              placeholder="任务 ID"
              className="h-10"
            />
          </Form.Item>

          <div className="flex flex-col justify-end">
            <Text className="mb-2 block text-sm text-slate-700">操作</Text>
            <Space wrap>
              <Button
                type="primary"
                htmlType="submit"
                icon={<Search className="size-4" />}
                className="h-10 rounded-lg"
              >
                查询
              </Button>
              <Button
                icon={<RotateCcw className="size-4" />}
                onClick={handleFilterReset}
                className="h-10 rounded-lg"
              >
                重置
              </Button>
            </Space>
          </div>
        </Form>

        <Table
          rowKey={(record) => String(record.id ?? record.createdAt ?? record.responseId)}
          columns={columns}
          dataSource={pageResult?.list ?? []}
          loading={callsQuery.isFetching}
          tableLayout="fixed"
          pagination={{
            current: pageResult?.pageNum ?? callSearch.pageNum,
            pageSize: pageResult?.pageSize ?? callSearch.pageSize,
            total,
            showSizeChanger: true,
            showTotal: (totalCount, rangeItems) =>
              `第 ${rangeItems[0]}-${rangeItems[1]} 条，共 ${totalCount} 条`,
          }}
          scroll={{ x: 1940 }}
          onChange={handleTableChange}
        />
      </Card>

      <Drawer
        open={Boolean(selectedCall)}
        title="调用详情"
        width="min(640px, calc(100vw - 32px))"
        destroyOnHidden
        classNames={{
          wrapper: 'max-w-[calc(100vw-32px)]!',
          body: 'overflow-x-hidden! px-5! py-4!',
        }}
        onClose={() => setSelectedCall(undefined)}
      >
        <div className="flex min-w-0 max-w-full flex-col gap-5 overflow-x-hidden">
          <DetailSection title="基础信息">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <DetailField label="调用 ID">{displayText(selectedCall?.id)}</DetailField>
              <DetailField label="调用时间">{formatDateTime(selectedCall?.createdAt)}</DetailField>
              <DetailField label="场景">{displayText(selectedCall?.scenario)}</DetailField>
              <DetailField label="状态">{getStatusTag(selectedCall?.status)}</DetailField>
              <DetailField label="应用 ID">{displayText(selectedCall?.appId)}</DetailField>
              <DetailField label="任务 ID">{displayText(selectedCall?.taskId)}</DetailField>
            </div>
          </DetailSection>

          <DetailSection title="模型与响应">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <DetailField label="模型">{displayText(selectedCall?.modelName)}</DetailField>
              <DetailField label="响应 ID">{displayText(selectedCall?.responseId)}</DetailField>
              <DetailField label="停止原因">{displayText(selectedCall?.finishReason)}</DetailField>
            </div>
          </DetailSection>

          <DetailSection title="Token 与耗时">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <DetailField label="输入 Tokens">
                {formatNumber(selectedCall?.inputTokens, 0)}
              </DetailField>
              <DetailField label="输出 Tokens">
                {formatNumber(selectedCall?.outputTokens, 0)}
              </DetailField>
              <DetailField label="总 Tokens">
                {formatNumber(selectedCall?.totalTokens, 0)}
              </DetailField>
              <DetailField label="耗时">{formatDuration(selectedCall?.durationMillis)}</DetailField>
            </div>
          </DetailSection>

          <DetailSection title="错误信息">
            <div className="grid min-w-0 gap-4">
              <DetailField label="错误类型">{displayText(selectedCall?.errorType)}</DetailField>
              <div className="min-w-0 rounded-lg border border-rose-100 bg-rose-50/70 p-3">
                <p className="m-0 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900 [overflow-wrap:anywhere]">
                  {displayText(selectedCall?.errorMessage)}
                </p>
              </div>
            </div>
          </DetailSection>
        </div>
      </Drawer>
    </div>
  )
}
