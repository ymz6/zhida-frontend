import {
  ListAdminAppCasesRequestStatus,
  ListAuditRecordsRequestStatus,
} from '@/api/generated/models'
import type {
  AppVO,
  AuditRecordVO,
  ListAdminAppCasesRequest,
  ListAppsRequest,
  ListAuditRecordsRequest,
} from '@/api/generated/models'
import type { QueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'

export const CASE_PAGE_SIZE = 10
export const CASE_MESSAGES_PAGE_SIZE = 20
export const CASE_AUDIT_HISTORY_PAGE_SIZE = 50
export const DISPLAY_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

export const APP_AUDIT_STATUS = {
  DRAFT: 0,
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
  WITHDRAWN: 4,
} as const

export const APP_CASE_STATUS_FILTER = {
  ALL: 'ALL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export type AppAuditStatusValue = (typeof APP_AUDIT_STATUS)[keyof typeof APP_AUDIT_STATUS]
export type AuditStatusFilter = 'ALL' | keyof typeof ListAuditRecordsRequestStatus
export type AuditRecordStatusValue = keyof typeof ListAuditRecordsRequestStatus
export type AppCaseStatusFilter =
  (typeof APP_CASE_STATUS_FILTER)[keyof typeof APP_CASE_STATUS_FILTER]
export type AppCaseFeaturedFilter = 'ALL' | boolean

export interface StatusMeta {
  label: string
  color: 'default' | 'processing' | 'success' | 'error' | 'warning' | 'blue' | 'green' | 'red'
}

const appAuditStatusMeta: Record<AppAuditStatusValue, StatusMeta> = {
  [APP_AUDIT_STATUS.DRAFT]: { label: '草稿', color: 'default' },
  [APP_AUDIT_STATUS.PENDING]: { label: '待审核', color: 'processing' },
  [APP_AUDIT_STATUS.APPROVED]: { label: '已公开', color: 'success' },
  [APP_AUDIT_STATUS.REJECTED]: { label: '已拒绝', color: 'error' },
  [APP_AUDIT_STATUS.WITHDRAWN]: { label: '已撤回', color: 'warning' },
}

const appCaseStatusMeta: Record<AppAuditStatusValue, StatusMeta> = {
  [APP_AUDIT_STATUS.DRAFT]: { label: '草稿', color: 'default' },
  [APP_AUDIT_STATUS.PENDING]: { label: '待审核', color: 'processing' },
  [APP_AUDIT_STATUS.APPROVED]: { label: '已公开', color: 'success' },
  [APP_AUDIT_STATUS.REJECTED]: { label: '已下架', color: 'error' },
  [APP_AUDIT_STATUS.WITHDRAWN]: { label: '已撤回', color: 'warning' },
}

const auditRecordStatusMeta: Record<AuditRecordStatusValue, StatusMeta> = {
  DRAFT: { label: '草稿', color: 'default' },
  PENDING: { label: '待审核', color: 'processing' },
  APPROVED: { label: '已通过', color: 'success' },
  REJECTED: { label: '已拒绝', color: 'error' },
  WITHDRAWN: { label: '已撤回', color: 'warning' },
}

const auditRecordStatusByNumber: Record<number, AuditRecordStatusValue> = {
  0: 'DRAFT',
  1: 'PENDING',
  2: 'APPROVED',
  3: 'REJECTED',
  4: 'WITHDRAWN',
}

export function buildCaseListRequest({
  pageNum,
  pageSize,
}: {
  pageNum: number
  pageSize: number
}): ListAppsRequest {
  return {
    pageNum,
    pageSize,
  }
}

export function buildAuditListRequest({
  pageNum,
  pageSize,
  status,
}: {
  pageNum: number
  pageSize: number
  status: AuditStatusFilter
}): ListAuditRecordsRequest {
  return {
    pageNum,
    pageSize,
    ...(status === 'ALL' ? {} : { status: ListAuditRecordsRequestStatus[status] }),
  }
}

export function buildAppCaseListRequest({
  pageNum,
  pageSize,
  status,
  featured,
  keyword,
}: {
  pageNum: number
  pageSize: number
  status: AppCaseStatusFilter
  featured: AppCaseFeaturedFilter
  keyword: string
}): ListAdminAppCasesRequest {
  return {
    pageNum,
    pageSize,
    ...(status === APP_CASE_STATUS_FILTER.ALL
      ? {}
      : { status: ListAdminAppCasesRequestStatus[status] }),
    ...(featured === 'ALL' ? {} : { featured }),
    ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
  }
}

export function getAppAuditStatusMeta(status?: number): StatusMeta {
  if (status === undefined || !(status in appAuditStatusMeta)) {
    return { label: '未知', color: 'default' }
  }

  return appAuditStatusMeta[status as AppAuditStatusValue]
}

export function getAppCaseStatusMeta(status?: number): StatusMeta {
  if (status === undefined || !(status in appCaseStatusMeta)) {
    return { label: '未知', color: 'default' }
  }

  return appCaseStatusMeta[status as AppAuditStatusValue]
}

export function normalizeAuditRecordStatus(
  status?: number | string,
): AuditRecordStatusValue | undefined {
  if (typeof status === 'number') {
    return auditRecordStatusByNumber[status]
  }

  if (typeof status === 'string' && status in auditRecordStatusMeta) {
    return status as AuditRecordStatusValue
  }

  return undefined
}

export function getAuditRecordStatusMeta(status?: number | string): StatusMeta {
  const normalizedStatus = normalizeAuditRecordStatus(status)

  if (!normalizedStatus) {
    return { label: '未知', color: 'default' }
  }

  return auditRecordStatusMeta[normalizedStatus]
}

export function getCaseSquareStatus(app: Pick<AppVO, 'auditStatus'>): StatusMeta {
  return app.auditStatus === APP_AUDIT_STATUS.APPROVED
    ? { label: '在广场中', color: 'green' }
    : { label: '不在广场', color: 'default' }
}

export function hasDeployUrl(app: Pick<AppVO, 'deployUrl'>) {
  return Boolean(app.deployUrl?.trim())
}

export function hasPublicDeployAnomaly(app: Pick<AppVO, 'auditStatus' | 'deployUrl'>) {
  return app.auditStatus === APP_AUDIT_STATUS.APPROVED && !hasDeployUrl(app)
}

export function canManageFeatured(app: Pick<AppVO, 'auditStatus'>) {
  return app.auditStatus === APP_AUDIT_STATUS.APPROVED
}

export function canApproveAuditRecord(
  record: Pick<AuditRecordVO, 'status'>,
  app: Pick<AppVO, 'deployUrl'>,
) {
  return normalizeAuditRecordStatus(record.status) === 'PENDING' && hasDeployUrl(app)
}

export function canRejectAuditRecord(record: Pick<AuditRecordVO, 'status'>) {
  return normalizeAuditRecordStatus(record.status) === 'PENDING'
}

export function canOfflineAppCase(app: Pick<AppVO, 'auditStatus'>) {
  return app.auditStatus === APP_AUDIT_STATUS.APPROVED
}

export function canReopenAppCase(app: Pick<AppVO, 'auditStatus'>) {
  return app.auditStatus === APP_AUDIT_STATUS.REJECTED
}

export function getCaseTitle(app?: Pick<AppVO, 'name'>) {
  return app?.name?.trim() || '未命名应用'
}

export function getCaseAuthorName(app?: Pick<AppVO, 'author'>) {
  return app?.author?.nickname?.trim() || '未知用户'
}

export function getCaseAuthorInitial(app?: Pick<AppVO, 'author'>) {
  return getCaseAuthorName(app).slice(0, 1).toUpperCase()
}

export function formatCaseDateTime(value?: string) {
  if (!value) {
    return '-'
  }

  const parsedValue = dayjs(value)
  return parsedValue.isValid() ? parsedValue.format(DISPLAY_DATE_TIME_FORMAT) : value
}

export function formatCaseTotal(value?: string | number) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return '0'
  }

  return new Intl.NumberFormat('zh-CN').format(numericValue)
}

export function getCaseErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

export function getAuditRecordApp(record: AuditRecordVO): AppVO | undefined {
  return record.app ?? undefined
}

export function findAuditRecord(records: AuditRecordVO[], recordId?: string) {
  if (!recordId) {
    return undefined
  }

  return records.find((record) => record.id === recordId)
}

export async function invalidateCaseManagementQueries(queryClient: QueryClient, appId: string) {
  // orval query keys use endpoint paths as prefixes, so prefix invalidation covers all pages.
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['/apps'] }),
    queryClient.invalidateQueries({ queryKey: ['/admin/audits'] }),
    queryClient.invalidateQueries({ queryKey: ['/cases'] }),
    queryClient.invalidateQueries({ queryKey: [`/apps/${appId}`] }),
    queryClient.invalidateQueries({ queryKey: [`/apps/${appId}/audit-records`] }),
  ])
}

export async function invalidateCaseAuditQueries(queryClient: QueryClient, recordId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['/admin/audits'] }),
    recordId
      ? queryClient.invalidateQueries({ queryKey: [`/admin/audits/${recordId}`] })
      : Promise.resolve(),
  ])
}

export async function invalidateAppCaseQueries(queryClient: QueryClient, appId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['/admin/app-cases'] }),
    queryClient.invalidateQueries({ queryKey: ['/cases'] }),
    appId
      ? queryClient.invalidateQueries({ queryKey: [`/admin/app-cases/${appId}`] })
      : Promise.resolve(),
  ])
}
