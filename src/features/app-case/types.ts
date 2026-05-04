export const APP_CASE_STATUS_LABELS = {
  PENDING: '待审核',
  APPROVED: '已公开',
  REJECTED: '已驳回',
  OFFLINE: '已下架',
} as const

export type AppCaseStatus = keyof typeof APP_CASE_STATUS_LABELS

export function isAppCaseStatus(value: string | undefined): value is AppCaseStatus {
  return Boolean(value && value in APP_CASE_STATUS_LABELS)
}
