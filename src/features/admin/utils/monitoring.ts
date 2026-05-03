import type { MonitoringDashboardRequest } from '@/api/generated/models'
import type { MonitoringTableResource } from '@/features/admin/types/monitoring'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

export const MONITORING_DASHBOARD_TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss'
export const MONITORING_QUERY_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
})

const integerFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 0,
})

export const MONITORING_TABLE_LABELS: Record<MonitoringTableResource, string> = {
  TASK_STAT: '任务统计',
  EXCEPTION_LOG: '异常日志',
  LLM_CALL_LOG: 'LLM 调用日志',
}

export function createDefaultMonitoringRange(): [Dayjs, Dayjs] {
  return [dayjs().subtract(3, 'hour'), dayjs()]
}

export function toMonitoringDashboardRangeParams(
  range: [Dayjs, Dayjs],
): MonitoringDashboardRequest {
  return {
    startTime: range[0].format(MONITORING_DASHBOARD_TIME_FORMAT),
    endTime: range[1].format(MONITORING_DASHBOARD_TIME_FORMAT),
  }
}

export function toMonitoringQueryRangeParams(range: [Dayjs, Dayjs]): MonitoringDashboardRequest {
  return {
    startTime: range[0].format(MONITORING_QUERY_TIME_FORMAT),
    endTime: range[1].format(MONITORING_QUERY_TIME_FORMAT),
  }
}

export function formatDateTime(value?: string | null) {
  return value || '-'
}

export function formatChartTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = dayjs(value)

  return date.isValid() ? date.format('MM-DD HH:mm') : value
}

export function formatNumber(value?: number | string | null, maximumFractionDigits = 2) {
  if (value == null || value === '') {
    return '-'
  }

  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return String(value)
  }

  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits,
  }).format(numberValue)
}

export function formatBytes(value: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = 0

  while (Math.abs(size) >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${numberFormatter.format(size)} ${units[unitIndex]}`
}

export function formatMetricValue(value?: number | string | null, unit?: string | null) {
  if (value == null || value === '') {
    return '-'
  }

  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return String(value)
  }

  if (unit === 'ratio') {
    return `${numberFormatter.format(numberValue * 100)}%`
  }

  if (unit === 'bytes') {
    return formatBytes(numberValue)
  }

  if (unit === 'seconds') {
    return `${integerFormatter.format(numberValue * 1000)} ms`
  }

  if (unit === 'ms') {
    return `${integerFormatter.format(numberValue)} ms`
  }

  if (unit === 'requests/s') {
    return `${numberFormatter.format(numberValue)} requests/s`
  }

  if (unit === 'tokens') {
    return `${integerFormatter.format(numberValue)} tokens`
  }

  return numberFormatter.format(numberValue)
}

export function trimToUndefined(value?: string | null) {
  const trimmed = value?.trim()

  return trimmed || undefined
}

export function parseOptionalNumber(value?: string | number | null) {
  if (value == null || value === '') {
    return undefined
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : undefined
}

export function compactFilters(filters: Record<string, unknown>) {
  const entries = Object.entries(filters).filter(([, value]) => {
    if (value == null) {
      return false
    }

    if (typeof value === 'string') {
      return value.trim().length > 0
    }

    return true
  })

  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === 'string' && message) {
      return message
    }
  }

  return '请求失败，请稍后重试'
}
