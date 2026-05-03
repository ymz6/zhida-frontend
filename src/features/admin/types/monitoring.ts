export type MonitoringSource = 'PROMETHEUS' | 'MYSQL'

export type MonitoringStatus = 'SUCCESS' | 'UNAVAILABLE'

export type MonitoringTableResource = 'TASK_STAT' | 'EXCEPTION_LOG' | 'LLM_CALL_LOG'

export interface TaskMonitoringStat {
  taskType?: string
  total?: number
  pending?: number
  running?: number
  success?: number
  failed?: number
  canceled?: number
  successRate?: number
  failedRate?: number
  averageDurationMillis?: number
}

export interface SystemExceptionLogInfo {
  id?: number
  exceptionType?: string
  resultCode?: number
  requestMethod?: string
  requestPath?: string
  errorMessage?: string
  stackTrace?: string
  userId?: number | null
  createdAt?: string
}

export interface LlmCallLogInfo {
  id?: number
  scenario?: string
  modelName?: string
  appId?: number | null
  taskId?: number | null
  status?: 'SUCCESS' | 'FAILED'
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
  durationMillis?: number | null
  errorMessage?: string | null
  createdAt?: string
}

export interface MonitoringTableState {
  pageNum: number
  pageSize: number
  filters?: Record<string, unknown>
}
