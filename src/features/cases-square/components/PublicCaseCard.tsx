import emptyAppCover from '@/assets/empty-app-cover.svg'
import { Avatar, Badge, Button, Tooltip } from 'antd'
import { Heart, Star } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'

export type PublicCaseCardData = {
  id: string | number
  title: string
  authorName: string
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
  const cardAction = action ?? (
    <Tooltip title="收藏案例">
      <Button
        type="text"
        aria-label={`${appCase.title} 收藏`}
        icon={
          <Heart
            className="size-5"
            aria-hidden="true"
          />
        }
        className="h-10 w-10 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100! hover:text-rose-500!"
      />
    </Tooltip>
  )
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
          className="shrink-0 bg-blue-50 text-blue-600"
        >
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
        <div
          className="shrink-0"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {cardAction}
        </div>
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
