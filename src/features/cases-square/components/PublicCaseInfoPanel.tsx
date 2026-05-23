import type { AppVO } from '@/api/generated/models'
import { Avatar } from 'antd'

import {
  formatPublicCaseDateTime,
  getPublicCaseAuthorInitial,
  getPublicCaseAuthorName,
  getPublicCaseTitle,
} from '../utils/publicCase'
import { PublicCaseFavoritePopover } from './PublicCaseFavoritePopover'
import { PublicCaseFollowButton } from './PublicCaseFollowButton'

export function PublicCaseInfoPanel({ app }: { app: AppVO }) {
  const title = getPublicCaseTitle(app)
  const authorName = getPublicCaseAuthorName(app)

  return (
    <section className="shrink-0 border-b border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 truncate text-xl font-bold text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            创建于 {formatPublicCaseDateTime(app.createdAt)}
          </p>
        </div>
        <PublicCaseFavoritePopover appId={app.id} />
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
        <Avatar
          size={36}
          src={app.author?.avatar}
          className="shrink-0 bg-blue-50 text-blue-600"
        >
          {getPublicCaseAuthorInitial(app)}
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-950">{authorName}</div>
          <div className="mt-0.5 text-xs text-slate-500">作者</div>
        </div>
        <PublicCaseFollowButton
          userId={app.author?.id}
          nickname={authorName}
        />
      </div>
    </section>
  )
}
