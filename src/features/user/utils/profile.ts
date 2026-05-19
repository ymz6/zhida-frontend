import type { AppVO } from '@/api/generated/models'

export type ProfileWorkAuditStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'withdrawn'

const appAuditStatusMap: Record<number, ProfileWorkAuditStatus> = {
  0: 'draft',
  1: 'pending',
  2: 'approved',
  3: 'rejected',
  4: 'withdrawn',
} as const

export function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

export function formatProfileDateTime(value?: string) {
  if (!value) {
    return '-'
  }

  return value.replace('T', ' ').slice(0, 19)
}

export function getAppDisplayName(app: AppVO) {
  return app.name?.trim() || '未命名作品'
}

export function getAppAuditStatus(app: AppVO): ProfileWorkAuditStatus {
  // 与后端 AppAuditStatus.code 保持一致，未知值按草稿兜底展示。
  return app.auditStatus === undefined ? 'draft' : (appAuditStatusMap[app.auditStatus] ?? 'draft')
}
