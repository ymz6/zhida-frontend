import emptyAppCover from '@/assets/empty-app-cover.svg'
import type { AppVO } from '@/api/generated/models'
import { Badge, Button, Tag } from 'antd'
import { ArrowUpRight, Star } from 'lucide-react'

import {
  formatProfileDateTime,
  getAppAuditStatus,
  getAppDisplayName,
  type ProfileWorkAuditStatus,
} from '../utils/profile'

export type ProfileWorkStatus = 'all' | ProfileWorkAuditStatus

export const workStatusLabels: Record<ProfileWorkStatus, string> = {
  all: '全部',
  draft: '草稿',
  pending: '审核中',
  approved: '已通过',
  rejected: '未通过',
  withdrawn: '已撤回',
}

const workStatusColors: Record<ProfileWorkAuditStatus, string> = {
  draft: 'default',
  pending: 'processing',
  approved: 'success',
  rejected: 'error',
  withdrawn: 'warning',
}

export function ProfileWorkCard({ work, onOpen }: { work: AppVO; onOpen: (work: AppVO) => void }) {
  const title = getAppDisplayName(work)
  const status = getAppAuditStatus(work)
  const createdAt = formatProfileDateTime(work.createdAt)
  const card = (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5 transition-shadow hover:shadow-md hover:shadow-slate-900/8">
      <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
        <img
          src={work.coverUrl || emptyAppCover}
          alt={`${title}封面`}
          className="size-full border-b border-slate-200 object-cover object-top"
        />
      </div>

      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="m-0 min-w-0 flex-1 truncate text-base font-semibold text-slate-950">
              {title}
            </h2>
            <Tag
              color={workStatusColors[status]}
              className="m-0 shrink-0"
            >
              {workStatusLabels[status]}
            </Tag>
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">创建于 {createdAt}</p>
        </div>
        <Button
          type="text"
          aria-label={`打开 ${title}`}
          icon={<ArrowUpRight className="size-5" />}
          disabled={!work.id}
          onClick={() => onOpen(work)}
          className="h-10 w-10 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100!"
        />
      </div>
    </article>
  )

  if (!work.featured) {
    return card
  }

  return (
    <Badge.Ribbon
      color="#bae6fd"
      text={
        <span className="inline-flex items-center gap-1 font-semibold text-sky-800">
          <Star className="size-3.5 fill-yellow-300 text-yellow-300" />
          精选
        </span>
      }
    >
      {card}
    </Badge.Ribbon>
  )
}
