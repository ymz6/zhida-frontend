import { useListCases } from '@/api/generated/endpoints/case'
import type { PageResultAppVO } from '@/api/generated/models'
import { Link } from '@tanstack/react-router'
import { Alert, Skeleton } from 'antd'
import { ArrowUpRight, Star } from 'lucide-react'

import { PublicCaseCard } from '@/features/cases-square/components/PublicCaseCard'
import {
  getPublicCaseErrorMessage,
  mapAppToPublicCaseCardData,
  openPublicCaseDetailInNewTab,
} from '@/features/cases-square/utils/publicCase'

const FEATURED_CASES_SIZE = 3

export function FeaturedCasesSection() {
  const featuredCasesQuery = useListCases<PageResultAppVO | undefined, { message?: string }>(
    {
      request: {
        pageNum: 1,
        pageSize: FEATURED_CASES_SIZE,
        featuredOnly: true,
      },
    },
    {
      query: {
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const featuredCases = featuredCasesQuery.data?.list ?? []

  return (
    <section className="relative z-10 mx-auto mt-16 max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center text-2xl font-bold text-slate-950">
            <span className="mr-3 flex size-9 items-center justify-center rounded-full bg-yellow-100 text-yellow-500">
              <Star
                className="size-5 fill-yellow-400"
                aria-hidden="true"
              />
            </span>
            精选案例
          </h2>
          <p className="mt-2 text-sm text-slate-500">看看这些案例，获得一点创建应用的灵感</p>
        </div>

        <Link
          to="/cases"
          className="inline-flex h-10 w-fit items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-4 text-sm font-medium text-sky-700 shadow-sm shadow-sky-900/5"
        >
          案例广场
          <ArrowUpRight
            className="size-4"
            aria-hidden="true"
          />
        </Link>
      </div>

      {featuredCasesQuery.isError ? (
        <Alert
          showIcon
          type="error"
          title="精选案例加载失败"
          description={getPublicCaseErrorMessage(featuredCasesQuery.error, '请稍后重试')}
          className="mt-5 rounded-xl"
        />
      ) : featuredCasesQuery.isLoading ? (
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: FEATURED_CASES_SIZE }).map((_, index) => (
            <Skeleton.Node
              key={index}
              active
              className="h-70! w-full! rounded-lg!"
            />
          ))}
        </div>
      ) : featuredCases.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredCases.map((app, index) => {
            const appCase = mapAppToPublicCaseCardData(app)

            return (
              <PublicCaseCard
                key={app.id ?? `${app.name ?? 'featured-case'}-${index}`}
                appCase={appCase}
                onOpen={(currentCase) => openPublicCaseDetailInNewTab(currentCase.id)}
              />
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
