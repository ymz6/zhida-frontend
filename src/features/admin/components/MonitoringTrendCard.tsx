import type { MonitoringMetricResult } from '@/api/generated/models'
import { formatChartTime } from '@/features/admin/utils/monitoring'
import { Line } from '@ant-design/plots'
import type { LineConfig } from '@ant-design/plots'
import { Card, Empty, Typography } from 'antd'

const { Text } = Typography

interface MonitoringTrendCardProps {
  metric?: MonitoringMetricResult
  loading?: boolean
}

interface MonitoringTrendPoint {
  time: string
  series: string
  value: number
}

function toTrendData(metric?: MonitoringMetricResult): MonitoringTrendPoint[] {
  return (metric?.series ?? []).flatMap((series) =>
    (series.points ?? [])
      .filter((point) => typeof point.value === 'number' && point.time)
      .map((point) => ({
        time: formatChartTime(point.time),
        series: series.name || metric?.title || '指标',
        value: point.value as number,
      })),
  )
}

export function MonitoringTrendCard({ metric, loading }: MonitoringTrendCardProps) {
  const chartData = toTrendData(metric)
  const isUnavailable = metric?.status === 'UNAVAILABLE'
  const lineConfig: LineConfig = {
    data: chartData,
    xField: 'time',
    yField: 'value',
    colorField: 'series',
    height: 240,
    autoFit: true,
  }

  return (
    <Card
      loading={loading}
      className="h-full rounded-xl border border-slate-200/60 bg-white shadow-sm"
      classNames={{
        body: 'h-full p-6!',
      }}
    >
      <div className="flex h-full min-h-78 flex-col">
        <Text className="mb-3 block truncate text-[15px] font-semibold text-slate-900">
          {metric?.title || '趋势图'}
        </Text>

        <div className="min-h-0 flex-1">
          {isUnavailable || chartData.length === 0 ? (
            <div className="flex h-60 items-center justify-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={metric?.errorMessage || '暂无趋势数据'}
              />
            </div>
          ) : (
            <Line {...lineConfig} />
          )}
        </div>
      </div>
    </Card>
  )
}
