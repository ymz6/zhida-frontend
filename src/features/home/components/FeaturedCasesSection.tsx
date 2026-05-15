import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Star } from 'lucide-react'

import { PublicCaseCard } from '@/features/cases-square/components/PublicCaseCard'
import type { PublicCaseCardData } from '@/features/cases-square/components/PublicCaseCard'

const featuredCases = [
  {
    id: 1,
    title: '会员运营后台',
    authorName: 'Krd168409708',
    createdAt: '2026-03-08',
    isFeatured: true,
  },
  {
    id: 2,
    title: '企业官网',
    authorName: 'Luna',
    createdAt: '2026-03-16',
    isFeatured: true,
  },
  {
    id: 3,
    title: '数据看板',
    authorName: 'Ming',
    createdAt: '2026-04-02',
    isFeatured: true,
  },
] satisfies PublicCaseCardData[]

export function FeaturedCasesSection() {
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

      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featuredCases.map((appCase) => (
          <PublicCaseCard
            key={appCase.id}
            appCase={appCase}
          />
        ))}
      </div>
    </section>
  )
}
