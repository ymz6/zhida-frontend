import { useGetMonitoringDashboard } from '@/api/generated/endpoints/admin-monitoring'
import type {
  MonitoringDashboard,
  MonitoringDashboardCard,
  MonitoringDashboardRequest,
  MonitoringMetricResult,
} from '@/api/generated/models'
import { MonitoringDetailTables } from '@/features/admin/components/MonitoringDetailTables'
import { MonitoringMetricCard } from '@/features/admin/components/MonitoringMetricCard'
import type { MetricColorType } from '@/features/admin/components/MonitoringMetricCard'
import { MonitoringTrendCard } from '@/features/admin/components/MonitoringTrendCard'
import {
  createDefaultMonitoringRange,
  getErrorMessage,
  toMonitoringDashboardRangeParams,
  toMonitoringQueryRangeParams,
} from '@/features/admin/utils/monitoring'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, DatePicker, Empty, Space, Typography } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  Activity,
  AlertTriangle,
  Cpu,
  Network,
  RefreshCw,
  Server,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

const { RangePicker } = DatePicker
const { Text, Title } = Typography

const METRIC_GROUP_PLACEHOLDERS = Array.from({ length: 4 }, (_, index) => ({
  key: `placeholder-${index}`,
  title: '',
})) satisfies MonitoringDashboardCard[]

const TREND_PLACEHOLDERS: MonitoringMetricResult[] = Array.from({ length: 4 }, (_, index) => ({
  queryId: `trend-placeholder-${index}`,
}))

interface MetricGroup {
  title: string
  colorType: MetricColorType
  icon: React.ReactNode
  iconBgClassName: string
  iconTextClassName: string
  cards?: MonitoringDashboardCard[]
}

function renderMetricGroup(group: MetricGroup, loading: boolean) {
  const cards = group.cards ?? []
  const displayCards = loading && cards.length === 0 ? METRIC_GROUP_PLACEHOLDERS : cards

  return (
    <section
      key={group.title}
      className="space-y-4"
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex items-center justify-center rounded-lg p-1.5 ${group.iconBgClassName} ${group.iconTextClassName}`}
        >
          {group.icon}
        </div>
        <Text className="text-base font-semibold text-slate-900">{group.title}</Text>
      </div>

      {displayCards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {displayCards.map((card) => (
            <MonitoringMetricCard
              key={card.key || card.title}
              card={card}
              loading={loading}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/60 bg-white py-12 shadow-sm">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无指标数据"
          />
        </div>
      )}
    </section>
  )
}

export function AdminDashboardPage() {
  const queryClient = useQueryClient()
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => createDefaultMonitoringRange())
  const dashboardRangeParams = toMonitoringDashboardRangeParams(range)
  const tableRangeParams = toMonitoringQueryRangeParams(range)
  const dashboardQuery = useGetMonitoringDashboard<
    MonitoringDashboard | undefined,
    { message?: string }
  >(
    { request: dashboardRangeParams },
    {
      request: {
        params: dashboardRangeParams,
      },
      query: {
        select: (response) => response.data,
        retry: false,
      },
    },
  )
  const dashboard = dashboardQuery.data
  const metricGroups: MetricGroup[] = [
    {
      title: '系统状态',
      colorType: 'blue',
      icon: <Server className="size-4" />,
      iconBgClassName: 'bg-blue-50',
      iconTextClassName: 'text-blue-600',
      cards: dashboard?.systemCards,
    },
    {
      title: '任务状态',
      colorType: 'emerald',
      icon: <Cpu className="size-4" />,
      iconBgClassName: 'bg-emerald-50',
      iconTextClassName: 'text-emerald-600',
      cards: dashboard?.taskCards,
    },
    {
      title: '异常状态',
      colorType: 'rose',
      icon: <AlertTriangle className="size-4" />,
      iconBgClassName: 'bg-rose-50',
      iconTextClassName: 'text-rose-600',
      cards: dashboard?.exceptionCards,
    },
    {
      title: 'LLM 用量',
      colorType: 'violet',
      icon: <Sparkles className="size-4" />,
      iconBgClassName: 'bg-violet-50',
      iconTextClassName: 'text-violet-600',
      cards: dashboard?.llmCards,
    },
  ]
  const charts = dashboard?.charts ?? []
  const displayCharts =
    dashboardQuery.isLoading && charts.length === 0 ? TREND_PLACEHOLDERS : charts

  const handleRangeChange = (dates: null | [Dayjs | null, Dayjs | null]) => {
    if (!dates?.[0] || !dates?.[1]) {
      return
    }

    setRange([dates[0], dates[1]])
  }

  const handleRefresh = () => {
    void dashboardQuery.refetch()
    void queryClient.invalidateQueries({
      queryKey: ['admin', 'monitoring', 'table'],
    })
  }

  return (
    <div className="mx-auto max-w-[1680px] space-y-6">
      <div className="rounded-xl border border-slate-200/60 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Activity className="size-5" />
            </div>
            <Title
              level={3}
              className="mb-0! text-[24px]! tracking-tight"
            >
              运行与用量监控
            </Title>
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
              format="YYYY-MM-DD HH:mm:ss"
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
              className="h-10 w-full min-w-72 rounded-lg! md:w-auto"
            />
            <Button
              icon={<RefreshCw className="size-4" />}
              loading={dashboardQuery.isFetching}
              onClick={handleRefresh}
              className="h-10 rounded-lg"
            >
              刷新
            </Button>
          </Space>
        </div>
      </div>

      {dashboard?.overallStatus === 'DEGRADED' ? (
        <Alert
          showIcon
          type="warning"
          title="系统运行指标暂不可用，业务监控数据仍正常展示。"
        />
      ) : null}

      {dashboardQuery.isError ? (
        <Alert
          showIcon
          type="error"
          title={getErrorMessage(dashboardQuery.error)}
        />
      ) : null}

      <div className="space-y-6">
        {metricGroups.map((group) => renderMetricGroup(group, dashboardQuery.isLoading))}
      </div>

      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center rounded-lg bg-sky-50 p-1.5 text-sky-600">
            <Network className="size-4" />
          </div>
          <Text className="text-base font-semibold text-slate-900">趋势分析</Text>
        </div>

        {displayCharts.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {displayCharts.map((metric) => (
              <MonitoringTrendCard
                key={metric.queryId || metric.key}
                metric={metric}
                loading={dashboardQuery.isLoading}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/60 bg-white py-16 shadow-sm">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无趋势图数据"
            />
          </div>
        )}
      </section>

      <div className="pt-2">
        <MonitoringDetailTables range={tableRangeParams as MonitoringDashboardRequest} />
      </div>
    </div>
  )
}
