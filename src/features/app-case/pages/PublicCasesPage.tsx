import { useListPublicCases } from '@/api/generated/endpoints/app-case'
import type { ListPublicAppCasesRequest, PageResultAppCaseSummary } from '@/api/generated/models'
import { keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Button, Empty, Input, Pagination, Skeleton } from 'antd'
import { Compass, RotateCcw, Search } from 'lucide-react'
import { useState } from 'react'

import { CaseCard } from '../components/CaseCard'
import { getErrorMessage } from '../utils/case'

const PUBLIC_CASES_PAGE_SIZE = 12

const DEFAULT_PUBLIC_CASES_REQUEST: ListPublicAppCasesRequest = {
  pageNum: 1,
  pageSize: PUBLIC_CASES_PAGE_SIZE,
}

function PublicCaseSkeleton() {
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

/**
 * @deprecated 旧公开案例列表页已废弃；/_basic/cases 已切换到 src/features/cases-square/pages/CasesSquarePage。
 */
export function PublicCasesPage() {
  const navigate = useNavigate()
  const [keywordInput, setKeywordInput] = useState('')
  const [request, setRequest] = useState<ListPublicAppCasesRequest>(DEFAULT_PUBLIC_CASES_REQUEST)
  const casesQuery = useListPublicCases<PageResultAppCaseSummary | undefined, { message?: string }>(
    { request },
    {
      request: {
        params: request,
      },
      query: {
        placeholderData: keepPreviousData,
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const pageResult = casesQuery.data
  const cases = pageResult?.list ?? []
  const total = Number(pageResult?.total ?? 0)

  const handleSearch = () => {
    setRequest((currentRequest) => ({
      ...currentRequest,
      pageNum: 1,
      keyword: keywordInput.trim() || undefined,
    }))
  }

  const handleReset = () => {
    setKeywordInput('')
    setRequest(DEFAULT_PUBLIC_CASES_REQUEST)
  }

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-slate-200/70 bg-white px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Compass className="size-5" />
              </div>
              <h1 className="m-0 text-3xl font-semibold tracking-tight text-slate-950">案例广场</h1>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              浏览已公开的应用案例，查看设计思路和最终预览效果。
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <Input
              allowClear
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              onPressEnter={handleSearch}
              placeholder="搜索标题、简介、应用名"
              className="h-11 min-w-0 rounded-xl sm:w-80"
            />
            <Button
              type="primary"
              icon={<Search className="size-4" />}
              onClick={handleSearch}
              className="h-11 rounded-xl px-5!"
            >
              搜索
            </Button>
            <Button
              icon={<RotateCcw className="size-4" />}
              onClick={handleReset}
              className="h-11 rounded-xl px-5!"
            >
              重置
            </Button>
          </div>
        </div>
      </section>

      {casesQuery.isError ? (
        <Alert
          showIcon
          type="error"
          title={getErrorMessage(casesQuery.error, '公开案例加载失败，请稍后重试')}
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
      ) : null}

      {casesQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: PUBLIC_CASES_PAGE_SIZE }).map((_, index) => (
            <PublicCaseSkeleton key={index} />
          ))}
        </div>
      ) : cases.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {cases.map((appCase) => (
              <CaseCard
                key={appCase.id}
                appCase={appCase}
                onOpen={(currentCase) => {
                  if (!currentCase.id) {
                    return
                  }

                  void navigate({
                    to: '/cases',
                  })
                }}
              />
            ))}
          </div>

          <div className="flex justify-center pt-2">
            <Pagination
              current={pageResult?.pageNum ?? request.pageNum}
              pageSize={pageResult?.pageSize ?? request.pageSize}
              total={total}
              showSizeChanger
              showTotal={(total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}
              onChange={(pageNum, pageSize) => {
                setRequest((currentRequest) => ({
                  ...currentRequest,
                  pageNum,
                  pageSize,
                }))
              }}
            />
          </div>
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无公开案例"
          className="rounded-3xl border border-dashed border-slate-200 bg-white/70 py-16"
        />
      )}
    </main>
  )
}
