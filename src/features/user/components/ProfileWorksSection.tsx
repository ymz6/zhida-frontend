import { Link } from '@tanstack/react-router'
import { Empty, Pagination, Tabs } from 'antd'
import {
  ArrowUpRight,
  CircleCheck,
  CircleX,
  Clock3,
  FilePenLine,
  FolderKanban,
  LayoutGrid,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { ProfileWorkCard, workStatusLabels } from './ProfileWorkCard'
import type { ProfileWorkItem, ProfileWorkStatus } from './ProfileWorkCard'

const PAGE_SIZE = 6

const workStatusIcons = {
  all: <LayoutGrid className="size-4" />,
  draft: <FilePenLine className="size-4" />,
  pending: <Clock3 className="size-4" />,
  approved: <CircleCheck className="size-4" />,
  rejected: <CircleX className="size-4" />,
} satisfies Record<ProfileWorkStatus, ReactNode>

const profileWorks = [
  {
    id: 1,
    title: '智能客服页面',
    createdAt: '2026-05-15',
    status: 'approved',
    isFeatured: true,
  },
  {
    id: 2,
    title: '数据看板模板',
    createdAt: '2026-05-14',
    status: 'pending',
    isFeatured: false,
  },
  {
    id: 3,
    title: '审批流表单',
    createdAt: '2026-05-12',
    status: 'draft',
    isFeatured: false,
  },
  {
    id: 4,
    title: '暗夜话题社区',
    createdAt: '2026-05-09',
    status: 'approved',
    isFeatured: false,
  },
  {
    id: 5,
    title: '客户线索看板',
    createdAt: '2026-05-03',
    status: 'rejected',
    isFeatured: false,
  },
  {
    id: 6,
    title: '活动报名页',
    createdAt: '2026-04-28',
    status: 'pending',
    isFeatured: false,
  },
  {
    id: 7,
    title: '团队任务面板',
    createdAt: '2026-04-20',
    status: 'draft',
    isFeatured: false,
  },
] satisfies ProfileWorkItem[]

const workStatusTabs = (Object.keys(workStatusLabels) as ProfileWorkStatus[]).map((status) => ({
  key: status,
  label: (
    <span className="inline-flex items-center gap-1.5">
      {workStatusIcons[status]}
      {workStatusLabels[status]}
    </span>
  ),
}))

export function ProfileWorksSection() {
  const [activeStatus, setActiveStatus] = useState<ProfileWorkStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const filteredWorks =
    activeStatus === 'all'
      ? profileWorks
      : profileWorks.filter((work) => work.status === activeStatus)
  const pageWorks = filteredWorks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <section className="relative z-10 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center text-2xl font-bold text-slate-950">
            <span className="mr-3 flex size-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <FolderKanban
                className="size-5"
                aria-hidden="true"
              />
            </span>
            我的作品
          </h2>
        </div>

        <Link
          to="/"
          className="inline-flex h-10 w-fit items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 text-sm font-medium text-sky-700 shadow-sm shadow-sky-900/5 transition-colors hover:border-sky-200 hover:bg-sky-50"
        >
          创建作品
          <ArrowUpRight
            className="size-4"
            aria-hidden="true"
          />
        </Link>
      </div>

      <Tabs
        centered
        activeKey={activeStatus}
        items={workStatusTabs}
        onChange={(status) => {
          setActiveStatus(status as ProfileWorkStatus)
          setCurrentPage(1)
        }}
        className="mt-5 [&_.ant-tabs-nav]:mb-5!"
      />

      {filteredWorks.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* 我的作品暂用本地结构占位，后续接入接口时替换数据来源即可。 */}
            {pageWorks.map((work) => (
              <ProfileWorkCard
                key={work.id}
                work={work}
              />
            ))}
          </div>

          <div className="mt-7 flex justify-center">
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={filteredWorks.length}
              showSizeChanger={false}
              onChange={setCurrentPage}
            />
          </div>
        </>
      ) : (
        <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无作品"
          />
        </div>
      )}
    </section>
  )
}
