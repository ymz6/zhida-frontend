import { Card } from 'antd'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Sparkles } from 'lucide-react'

const featuredCases = [
  {
    title: '会员运营后台',
    description: '订单、积分、活动配置一站式管理',
    colorClass: 'bg-sky-100',
  },
  {
    title: '企业官网',
    description: '服务介绍、案例展示、团队信息整合',
    colorClass: 'bg-emerald-100',
  },
  {
    title: '数据看板',
    description: '关键指标、趋势图表、业务概览',
    colorClass: 'bg-amber-100',
  },
]

export function FeaturedCasesSection() {
  return (
    <section className="relative z-10 mx-auto mt-16 max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center text-2xl font-bold text-slate-950">
            <span className="mr-3 flex size-9 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <Sparkles
                className="size-5"
                aria-hidden="true"
              />
            </span>
            精选案例
          </h2>
          <p className="mt-2 text-sm text-slate-500">看看这些案例，获得一点创建应用的灵感</p>
        </div>

        <Link
          to="/"
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
          <Card
            key={appCase.title}
            variant="borderless"
            className="overflow-hidden rounded-xl! shadow-sm shadow-slate-900/5"
          >
            {/* 先用纯色块占位，等卡片设计确定后再替换为真实案例封面。 */}
            <div className={`h-36 rounded-lg ${appCase.colorClass}`} />
            <h3 className="mt-4 text-base font-semibold text-slate-950">{appCase.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{appCase.description}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
