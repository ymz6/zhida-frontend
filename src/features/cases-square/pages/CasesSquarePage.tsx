import { Input, Pagination, Select } from 'antd'
import { Compass, Search } from 'lucide-react'

import { PublicCaseCard } from '../components/PublicCaseCard'
import type { PublicCaseCardData } from '../components/PublicCaseCard'

const CASE_FILTER_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '精选', value: 'featured' },
]

// 先用占位数据确定卡片层级，后续接入接口时替换为真实案例列表。
const CASE_CARD_PLACEHOLDERS = Array.from({ length: 9 }).map((_, index) => ({
  id: index + 1,
  title: ['WePin（微拼）', '数据运营看板', '会员运营后台'][index % 3],
  authorName: ['Krd168409708', 'Luna', 'Ming'][index % 3],
  createdAt: ['2026-03-08', '2026-03-16', '2026-04-02'][index % 3],
  isFeatured: index % 3 === 0,
})) satisfies PublicCaseCardData[]

export function CasesSquarePage() {
  return (
    <main className="space-y-6">
      <header>
        <h1 className="m-0 flex items-center gap-3 text-3xl font-semibold text-slate-950">
          <span className="flex size-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <Compass className="size-5" />
          </span>
          案例广场
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          浏览优秀应用案例，发现可复用的搭建思路。
        </p>
      </header>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          allowClear
          size="large"
          prefix={<Search className="size-4 text-slate-400" />}
          placeholder="搜索案例"
          className="h-12 min-w-0 flex-1 rounded-full! px-5! shadow-sm shadow-slate-900/5"
        />
        <Select
          size="large"
          defaultValue="all"
          options={CASE_FILTER_OPTIONS}
          className="h-12 w-full rounded-full! [--ant-select-border-radius:9999px] [--ant-select-height:48px] [--ant-select-padding-horizontal:20px] sm:w-28"
        />
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {CASE_CARD_PLACEHOLDERS.map((appCase) => (
          <PublicCaseCard
            key={appCase.id}
            appCase={appCase}
          />
        ))}
      </section>

      <footer className="flex justify-center pt-2">
        <Pagination
          current={1}
          pageSize={9}
          total={90}
          showSizeChanger={false}
        />
      </footer>
    </main>
  )
}
