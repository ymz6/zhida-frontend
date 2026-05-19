import { useListMyCases } from '@/api/generated/endpoints/case'
import { ListMyCasesRequestStatus } from '@/api/generated/models'
import type { ListMyCasesRequest, PageResultAppVO } from '@/api/generated/models'
import { keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { Alert, Empty, Pagination, Skeleton, Tabs } from 'antd'
import {
  ArrowUpRight,
  CircleCheck,
  CircleMinus,
  CircleX,
  Clock3,
  FilePenLine,
  FolderKanban,
  LayoutGrid,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { ProfileWorkCard, workStatusLabels } from './ProfileWorkCard'
import type { ProfileWorkStatus } from './ProfileWorkCard'
import { getErrorMessage } from '../utils/profile'

const PAGE_SIZE = 6

const workStatusRequestMap: Record<Exclude<ProfileWorkStatus, 'all'>, ListMyCasesRequestStatus> = {
  draft: ListMyCasesRequestStatus.DRAFT,
  pending: ListMyCasesRequestStatus.PENDING,
  approved: ListMyCasesRequestStatus.APPROVED,
  rejected: ListMyCasesRequestStatus.REJECTED,
  withdrawn: ListMyCasesRequestStatus.WITHDRAWN,
}

const workStatusIcons = {
  all: <LayoutGrid className="size-4" />,
  draft: <FilePenLine className="size-4" />,
  pending: <Clock3 className="size-4" />,
  approved: <CircleCheck className="size-4" />,
  rejected: <CircleX className="size-4" />,
  withdrawn: <CircleMinus className="size-4" />,
} satisfies Record<ProfileWorkStatus, ReactNode>

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
  const navigate = useNavigate()
  const [activeStatus, setActiveStatus] = useState<ProfileWorkStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const search: ListMyCasesRequest = {
    pageNum: currentPage,
    pageSize: PAGE_SIZE,
    status: activeStatus === 'all' ? undefined : workStatusRequestMap[activeStatus],
  }
  const queryParams = {
    request: search,
  }
  const worksQuery = useListMyCases<PageResultAppVO | undefined, { message?: string }>(
    queryParams,
    {
      request: {
        params: search,
      },
      query: {
        placeholderData: keepPreviousData,
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const pageResult = worksQuery.data
  const works = pageResult?.list ?? []
  const total = Number(pageResult?.total ?? 0)

  return (
    <section className="relative z-10 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center text-2xl font-bold text-slate-950">我的作品</h2>
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

      {worksQuery.isError ? (
        <Alert
          showIcon
          type="error"
          title="作品加载失败"
          description={getErrorMessage(worksQuery.error, '请稍后重试')}
          action={
            <button
              type="button"
              onClick={() => void worksQuery.refetch()}
              className="text-sm font-medium text-sky-600 hover:text-sky-700"
            >
              重试
            </button>
          }
          className="rounded-2xl"
        />
      ) : worksQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <Skeleton.Node
              key={index}
              active
              className="h-70! w-full! rounded-lg!"
            />
          ))}
        </div>
      ) : works.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => (
              <ProfileWorkCard
                key={work.id}
                work={work}
                onOpen={(currentWork) => {
                  if (!currentWork.id) {
                    return
                  }

                  void navigate({
                    to: '/workbench/$appId',
                    params: { appId: currentWork.id },
                  })
                }}
              />
            ))}
          </div>

          <div className="mt-7 flex justify-center">
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={total}
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
