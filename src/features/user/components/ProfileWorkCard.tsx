import emptyAppCover from '@/assets/empty-app-cover.svg'
import { Badge, Button, Dropdown, Tag } from 'antd'
import type { MenuProps } from 'antd'
import { MoreHorizontal, Star, Trash2 } from 'lucide-react'

export type ProfileWorkStatus = 'all' | 'draft' | 'pending' | 'approved' | 'rejected'

export type ProfileWorkItem = {
  id: number
  title: string
  createdAt: string
  status: Exclude<ProfileWorkStatus, 'all'>
  isFeatured: boolean
}

export const workStatusLabels: Record<ProfileWorkStatus, string> = {
  all: '全部',
  draft: '草稿',
  pending: '审核中',
  approved: '已通过',
  rejected: '未通过',
}

const workStatusColors: Record<ProfileWorkItem['status'], string> = {
  draft: 'default',
  pending: 'processing',
  approved: 'success',
  rejected: 'error',
}

const workActionItems: MenuProps['items'] = [
  {
    key: 'delete',
    danger: true,
    icon: <Trash2 className="size-4" />,
    label: '删除作品',
  },
]

export function ProfileWorkCard({ work }: { work: ProfileWorkItem }) {
  const card = (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/5 transition-shadow hover:shadow-md hover:shadow-slate-900/8">
      <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
        <img
          src={emptyAppCover}
          alt={`${work.title}封面`}
          className="size-full border-b border-slate-200 object-cover object-top"
        />
      </div>

      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="m-0 min-w-0 flex-1 truncate text-base font-semibold text-slate-950">
              {work.title}
            </h2>
            <Tag
              color={workStatusColors[work.status]}
              className="m-0 shrink-0"
            >
              {workStatusLabels[work.status]}
            </Tag>
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">创建于 {work.createdAt}</p>
        </div>
        <Dropdown
          menu={{ items: workActionItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            aria-label={`${work.title} 更多操作`}
            icon={<MoreHorizontal className="size-5" />}
            className="h-10 w-10 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100!"
          />
        </Dropdown>
      </div>
    </article>
  )

  if (!work.isFeatured) {
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
