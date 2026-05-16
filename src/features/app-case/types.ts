/**
 * @deprecated 旧案例模块状态定义，仅为渐进移除保留；新案例广场请使用 src/features/cases-square。
 */
export const APP_CASE_STATUS_LABELS = {
  PENDING: '待审核',
  APPROVED: '已公开',
  REJECTED: '已驳回',
  OFFLINE: '已下架',
} as const

/**
 * @deprecated 旧案例模块状态类型，仅为渐进移除保留。
 */
export type AppCaseStatus = keyof typeof APP_CASE_STATUS_LABELS

/**
 * @deprecated 旧案例模块状态判断，仅为渐进移除保留。
 */
export function isAppCaseStatus(value: string | undefined): value is AppCaseStatus {
  return Boolean(value && value in APP_CASE_STATUS_LABELS)
}
