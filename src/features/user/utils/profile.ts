import type { AppVO } from '@/api/generated/models'

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

export function getAppAuditStatus(app: AppVO) {
  if (app.auditStatus === 1) {
    return 'approved'
  }

  if (app.auditStatus === 2) {
    return 'rejected'
  }

  if (app.auditStatus === 0) {
    return 'pending'
  }

  return 'draft'
}
