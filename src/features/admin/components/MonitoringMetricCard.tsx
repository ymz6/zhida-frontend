import type { MonitoringDashboardCard } from '@/api/generated/models'
import { formatMetricValue } from '@/features/admin/utils/monitoring'
import { Card, Typography } from 'antd'
import { AlertCircle } from 'lucide-react'

const { Text } = Typography

export type MetricColorType = 'blue' | 'emerald' | 'rose' | 'violet'

interface MonitoringMetricCardProps {
  card: MonitoringDashboardCard
  loading?: boolean
  colorType?: MetricColorType
}

export function MonitoringMetricCard({
  card,
  loading,
}: MonitoringMetricCardProps) {
  const isUnavailable = card.status === 'UNAVAILABLE'

  return (
    <Card
      loading={loading}
      className="group relative h-full overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md cursor-pointer"
      classNames={{
        body: 'p-6! h-full flex flex-col',
      }}
    >
      <div className="flex h-full min-h-24 flex-col justify-between gap-4">
        <Text className="block truncate text-sm font-medium text-slate-500">
          {card.title || '未命名指标'}
        </Text>

        <div>
          <div className="break-words text-[28px] font-bold tracking-tight text-slate-900 leading-none">
            {formatMetricValue(card.value, card.unit)}
          </div>
          {isUnavailable ? (
            <div className="mt-2.5 flex items-center gap-1.5 text-rose-500">
              <AlertCircle className="size-3.5" />
              <Text className="text-xs text-rose-500">
                {card.errorMessage || '指标暂不可用'}
              </Text>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
