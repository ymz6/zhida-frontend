import { useListPublicCases } from '@/api/generated/endpoints/app-case'
import type { PageResultAppCaseSummary } from '@/api/generated/models'
import { keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Button, Empty, Skeleton } from 'antd'
import { ArrowRight, Compass, RotateCcw } from 'lucide-react'

import { getErrorMessage } from '../utils/case'
import { CaseCard } from './CaseCard'

const HOME_CASES_REQUEST = {
  pageNum: 1,
  pageSize: 6,
}

function CaseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
      <div className="aspect-video bg-slate-100" />
      <div className="px-4 py-4">
        <Skeleton
          active
          avatar={{ size: 34 }}
          title={{ width: '74%' }}
          paragraph={{ rows: 3, width: ['100%', '86%', '46%'] }}
        />
      </div>
    </div>
  )
}

export function PublicCasesPreviewSection() {
  const navigate = useNavigate()
  const casesQuery = useListPublicCases<PageResultAppCaseSummary | undefined, { message?: string }>(
    { request: HOME_CASES_REQUEST },
    {
      request: {
        params: HOME_CASES_REQUEST,
      },
      query: {
        placeholderData: keepPreviousData,
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const cases = casesQuery.data?.list ?? []

  return (
    <section className="relative z-10 mx-auto mt-16 max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center text-2xl font-bold text-slate-950">
          <Compass className="mr-3 size-6 text-blue-500" />
          案例广场
        </h2>
        <Button
          icon={<ArrowRight className="size-4" />}
          iconPlacement="end"
          onClick={() => void navigate({ to: '/cases' })}
          className="h-10 rounded-full px-5!"
        >
          查看全部
        </Button>
      </div>

      {casesQuery.isLoading ? (
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: HOME_CASES_REQUEST.pageSize }).map((_, index) => (
            <CaseCardSkeleton key={index} />
          ))}
        </div>
      ) : casesQuery.isError ? (
        <Alert
          showIcon
          type="error"
          className="mt-5 rounded-xl!"
          title={getErrorMessage(casesQuery.error, '案例广场加载失败，请稍后重试')}
          action={
            <Button
              size="small"
              icon={<RotateCcw className="size-4" />}
              onClick={() => void casesQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      ) : cases.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((appCase) => (
            <CaseCard
              key={appCase.id}
              appCase={appCase}
              onOpen={(currentCase) => {
                if (!currentCase.id) {
                  return
                }

                void navigate({
                  to: '/cases/$caseId',
                  params: { caseId: currentCase.id },
                })
              }}
            />
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无公开案例"
          className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white/70 py-12"
        />
      )}
    </section>
  )
}
