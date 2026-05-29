import type { AppVO, CommentVO } from '@/api/generated/models'
import dayjs from 'dayjs'

import type { PublicCaseCardData } from '../components/PublicCaseCard'

export function formatPublicCaseDateTime(value?: string) {
  if (!value) {
    return '-'
  }

  const parsedValue = dayjs(value)
  return parsedValue.isValid() ? parsedValue.format('YYYY-MM-DD HH:mm:ss') : value
}

export function getPublicCaseTitle(app?: Pick<AppVO, 'name'>) {
  return app?.name?.trim() || '未命名应用'
}

export function getPublicCaseAuthorName(app?: Pick<AppVO, 'author'>) {
  return app?.author?.nickname?.trim() || '未知作者'
}

export function getPublicCaseAuthorInitial(app?: Pick<AppVO, 'author'>) {
  return getPublicCaseAuthorName(app).slice(0, 1).toUpperCase()
}

export function formatPublicCaseCount(value?: string) {
  const count = Number(value ?? 0)
  return Number.isFinite(count) ? count : 0
}

export function mapAppToPublicCaseCardData(app: AppVO): PublicCaseCardData {
  return {
    id: app.id ?? getPublicCaseTitle(app),
    title: getPublicCaseTitle(app),
    authorName: getPublicCaseAuthorName(app),
    authorAvatar: app.author?.avatar,
    createdAt: formatPublicCaseDateTime(app.publishedAt ?? app.createdAt),
    isFeatured: Boolean(app.featured),
    coverUrl: app.coverUrl,
  }
}

export function openPublicCaseDetailInNewTab(appId: string | number) {
  window.open(`/cases/${appId}`, '_blank', 'noopener,noreferrer')
}

export function getPublicCaseErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim()
    return message || fallback
  }

  return fallback
}

export function canDeletePublicCaseComment(comment: CommentVO, currentUserId?: string) {
  return Boolean(comment.author?.id && currentUserId && comment.author.id === currentUserId)
}
