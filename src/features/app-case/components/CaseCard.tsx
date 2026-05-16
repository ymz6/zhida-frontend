import type { AppCaseSummary } from '@/api/generated/models'
import { Avatar, Button, Card, Tag } from 'antd'
import { ExternalLink } from 'lucide-react'

import {
  formatCaseDate,
  getCaseAuthorName,
  getCaseSummary,
  getCaseTitle,
  openCasePreview,
} from '../utils/case'
import { CaseCover } from './CaseCover'

/**
 * @deprecated 旧案例卡片组件；新案例广场请使用 src/features/cases-square/components/PublicCaseCard。
 */
export function CaseCard({
  appCase,
  onOpen,
}: {
  appCase: AppCaseSummary
  onOpen?: (appCase: AppCaseSummary) => void
}) {
  const title = getCaseTitle(appCase.title)
  const summary = getCaseSummary(appCase.summary)
  const authorName = getCaseAuthorName(appCase.author)
  const authorInitial = authorName.trim().slice(0, 1) || '用'

  return (
    <Card
      hoverable
      variant="outlined"
      aria-label={title}
      onClick={() => onOpen?.(appCase)}
      className="group h-full overflow-hidden rounded-xl! border-slate-200/70! bg-white! shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-200! hover:shadow-lg hover:shadow-sky-900/10"
      classNames={{
        body: 'p-0!',
        cover: 'overflow-hidden',
      }}
      cover={
        <CaseCover
          coverUrl={appCase.coverUrl}
          title={title}
        />
      }
    >
      <div className="flex min-h-44 flex-col gap-3 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-base font-semibold text-slate-950">{title}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{summary}</p>
          </div>
          {appCase.featured ? (
            <Tag
              color="gold"
              className="m-0 shrink-0"
            >
              精选
            </Tag>
          ) : null}
        </div>

        <div className="mt-auto flex min-w-0 items-center gap-3">
          <Avatar
            src={appCase.author?.avatar}
            size={34}
            className="shrink-0 bg-sky-100! text-sky-600!"
          >
            {authorInitial}
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700">{authorName}</p>
            <p className="truncate text-xs text-slate-400">{formatCaseDate(appCase.reviewedAt)}</p>
          </div>
          <Button
            size="small"
            disabled={!appCase.previewUrl}
            icon={<ExternalLink className="size-3.5" />}
            onClick={(event) => {
              event.stopPropagation()
              openCasePreview(appCase.previewUrl)
            }}
          >
            预览
          </Button>
        </div>
      </div>
    </Card>
  )
}
