import type { AppVO } from '@/api/generated/models'
import { Tag } from 'antd'

import {
  getAppCaseStatusMeta,
  getAppAuditStatusMeta,
  getAuditRecordStatusMeta,
  getCaseSquareStatus,
} from '../utils/caseManagement'

export function AppAuditStatusTag({ status }: { status?: number }) {
  const meta = getAppAuditStatusMeta(status)

  return (
    <Tag
      color={meta.color}
      className="m-0"
    >
      {meta.label}
    </Tag>
  )
}

export function AuditRecordStatusTag({ status }: { status?: number | string }) {
  const meta = getAuditRecordStatusMeta(status)

  return (
    <Tag
      color={meta.color}
      className="m-0"
    >
      {meta.label}
    </Tag>
  )
}

export function AppCaseStatusTag({ status }: { status?: number }) {
  const meta = getAppCaseStatusMeta(status)

  return (
    <Tag
      color={meta.color}
      className="m-0"
    >
      {meta.label}
    </Tag>
  )
}

export function CaseSquareStatusTag({ app }: { app: Pick<AppVO, 'auditStatus'> }) {
  const meta = getCaseSquareStatus(app)

  return (
    <Tag
      color={meta.color}
      className="m-0"
    >
      {meta.label}
    </Tag>
  )
}

export function FeaturedStatusTag({
  featured,
  disabled,
}: {
  featured?: boolean
  disabled?: boolean
}) {
  if (disabled) {
    return <span className="text-slate-400">不可操作</span>
  }

  return (
    <Tag
      color={featured ? 'gold' : 'default'}
      className="m-0"
    >
      {featured ? '已精选' : '未精选'}
    </Tag>
  )
}
