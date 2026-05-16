import type { AppAuthor } from '@/api/generated/models'
import type { QueryClient } from '@tanstack/react-query'

import { APP_CASE_STATUS_LABELS, isAppCaseStatus } from '../types'

/**
 * @deprecated 旧案例模块工具函数，仅为渐进移除保留。
 */
export function getCaseStatusLabel(status: string | undefined) {
  return isAppCaseStatus(status) ? APP_CASE_STATUS_LABELS[status] : '未知状态'
}

/**
 * @deprecated 旧案例模块工具函数，仅为渐进移除保留。
 */
export function getCaseStatusColor(status: string | undefined) {
  if (status === 'PENDING') {
    return 'processing'
  }

  if (status === 'APPROVED') {
    return 'success'
  }

  if (status === 'REJECTED') {
    return 'error'
  }

  if (status === 'OFFLINE') {
    return 'warning'
  }

  return 'default'
}

/**
 * @deprecated 旧案例模块工具函数，仅为渐进移除保留。
 */
export function canResubmitCase(status: string | undefined) {
  return status === 'REJECTED' || status === 'OFFLINE'
}

/**
 * @deprecated 旧案例模块工具函数，仅为渐进移除保留。
 */
export function formatCaseDate(value: string | undefined) {
  if (!value) {
    return '-'
  }

  return value.split(/[T ]/)[0] || value
}

/**
 * @deprecated 旧案例模块工具函数，仅为渐进移除保留。
 */
export function formatCaseDateTime(value: string | undefined) {
  if (!value) {
    return '-'
  }

  return value.replace('T', ' ').split('.')[0]
}

/**
 * @deprecated 旧案例模块工具函数，仅为渐进移除保留。
 */
export function getCaseAuthorName(author: AppAuthor | undefined) {
  return author?.nickname?.trim() || '未知用户'
}

/**
 * @deprecated 旧案例模块工具函数，仅为渐进移除保留。
 */
export function getCaseTitle(title: string | undefined) {
  return title?.trim() || '未命名案例'
}

/**
 * @deprecated 旧案例模块工具函数，仅为渐进移除保留。
 */
export function getCaseSummary(summary: string | undefined) {
  return summary?.trim() || '暂无简介'
}

/**
 * @deprecated 旧案例模块工具函数，仅为渐进移除保留。
 */
export function getErrorMessage(error: unknown, fallback: string) {
  return (error as { message?: string } | undefined)?.message ?? fallback
}

/**
 * @deprecated 旧案例模块工具函数，仅为渐进移除保留。
 */
export function openCasePreview(previewUrl: string | undefined) {
  if (previewUrl) {
    window.open(previewUrl, '_blank', 'noreferrer')
  }
}

/**
 * @deprecated 旧案例模块缓存失效逻辑，仅为旧投稿/后台管理入口保留。
 */
export function invalidateCaseQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['/cases'] })
  void queryClient.invalidateQueries({ queryKey: ['/cases/mine'] })
  void queryClient.invalidateQueries({ queryKey: ['/admin/cases'] })
}
