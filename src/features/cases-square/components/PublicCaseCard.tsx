import emptyAppCover from '@/assets/empty-app-cover.svg'
import { Avatar, Badge } from 'antd'
import { Star } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'

export type PublicCaseCardData = {
  id: string | number
  title: string
  authorName: string
  authorAvatar?: string
  createdAt: string
  isFeatured: boolean
  coverUrl?: string
}

export function PublicCaseCard({
  appCase,
  action,
  onOpen,
}: {
  appCase: PublicCaseCardData
  action?: ReactNode
  onOpen?: (appCase: PublicCaseCardData) => void
}) {
  const isInteractive = Boolean(onOpen)
  const handleOpen = () => {
    onOpen?.(appCase)
  }
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    handleOpen()
  }
  const card = (
    <article
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleOpen : undefined}
      onKeyDown={isInteractive ? handleCardKeyDown : undefined}
      className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5 transition-shadow hover:shadow-md hover:shadow-slate-900/8 ${
        isInteractive
          ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2'
          : ''
      }`}
    >
      <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
        <img
          src={appCase.coverUrl || emptyAppCover}
          alt={`${appCase.title}封面`}
          className="size-full border-b border-slate-200 object-cover object-top"
        />
      </div>

      <div className="flex items-center gap-3 p-4">
        <Avatar
          size={44}
          src={appCase.authorAvatar}
          alt={appCase.authorName}
          className="shrink-0 bg-blue-50 text-blue-600"
        >
          {/* 头像缺失或加载失败时，保留作者首字作为兜底。 */}
          {appCase.authorName.slice(0, 1)}
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="m-0 truncate text-base font-semibold text-slate-950">{appCase.title}</h2>
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">
            {appCase.authorName} · {appCase.createdAt}
          </p>
        </div>
        {action ? (
          <div
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {action}
          </div>
        ) : null}
      </div>
    </article>
  )

  if (!appCase.isFeatured) {
    return card
  }

  return (
    <div className="-mr-2 overflow-visible pr-2">
      <Badge.Ribbon
        color="#bae6fd"
        text={
          <span className="inline-flex items-center gap-1 font-semibold text-sky-800">
            <Star
              className="size-3.5 fill-yellow-300 text-yellow-300"
              aria-hidden="true"
            />
            精选
          </span>
        }
      >
        {card}
      </Badge.Ribbon>
    </div>
  )
}
