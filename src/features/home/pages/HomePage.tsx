import { useAuthSessionStore } from '@/stores/auth-session'
import { App, Button, Input } from 'antd'
import { ArrowUp, Compass, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { FeaturedCasesSection } from '../components/FeaturedCasesSection'
import { useTypewriterPlaceholder } from '../hooks/useTypewriterPlaceholder'

const { TextArea } = Input

const typewriterPrompts = [
  '创建一个咖啡店会员管理后台，包含订单、积分和活动配置',
  '生成一个企业官网，展示服务、案例、团队和联系方式',
]

export function HomePage() {
  const promptPlaceholder = useTypewriterPlaceholder(typewriterPrompts)
  const { message } = App.useApp()
  const isAuthenticated = useAuthSessionStore((state) => Boolean(state.accessToken))
  const [prompt, setPrompt] = useState('')

  const handleCreateApp = () => {
    const nextPrompt = prompt.trim()

    if (!nextPrompt) {
      message.warning('请先描述你想生成的应用')
      return
    }

    if (nextPrompt.length > 4000) {
      message.warning('需求描述不能超过 4000 个字符')
      return
    }

    // 后端创建逻辑已移除，避免首页继续触发创建应用请求。
    message.info('应用创建接口暂未接入')
  }

  return (
    <main className="relative min-h-[calc(100vh-10rem)] overflow-hidden py-10 sm:py-12">
      {/* Background Blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex justify-center">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-sky-400/20 mix-blend-multiply blur-3xl" />
        <div className="absolute top-20 right-1/4 h-96 w-96 rounded-full bg-blue-400/20 mix-blend-multiply blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-cyan-400/20 mix-blend-multiply blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-124 max-w-5xl flex-col items-center justify-center text-center">
        {/* Floating Mini UI/Code Decorators */}
        <div className="pointer-events-none absolute top-10 -left-12 hidden flex-col gap-2 rounded-2xl border border-slate-200/50 bg-white/40 p-3 shadow-lg shadow-sky-900/5 backdrop-blur-md lg:flex">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-rose-400" />
            <div className="size-2.5 rounded-full bg-amber-400" />
            <div className="size-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="mt-2 h-2 w-24 rounded-full bg-slate-200" />
          <div className="h-2 w-16 rounded-full bg-slate-200" />
          <div className="h-2 w-20 rounded-full bg-slate-200" />
        </div>

        <div className="pointer-events-none absolute top-24 -right-8 hidden rounded-2xl border border-slate-200/50 bg-white/40 p-4 shadow-lg shadow-sky-900/5 backdrop-blur-md lg:block">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Compass className="size-4 text-blue-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-2 w-16 rounded-full bg-slate-300" />
              <div className="h-2 w-10 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>

        <h1 className="flex items-center justify-center gap-3 text-balance font-['Microsoft_YouYuan','YouYuan','幼圆','Microsoft_YaHei_UI',sans-serif] text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
          <Sparkles className="size-8 text-sky-500 sm:size-12" />
          说出想法，生成应用
        </h1>
        <p className="mt-3 max-w-2xl font-['JetBrains_Mono','Fira_Code','Menlo','Monaco','Consolas',monospace] text-sm leading-7 text-slate-600 sm:text-base">
          Create wonderful code, build a wonderful world
        </p>

        <div className="group relative mt-9 w-full max-w-3xl overflow-hidden rounded-4xl bg-slate-200/60 p-0.5 shadow-xl shadow-sky-900/5 transition-all duration-300 focus-within:shadow-2xl focus-within:shadow-sky-500/10">
          {/* 彩虹层只露出外层 2px padding，内侧由纯白输入面板完全遮住。 */}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 ease-out group-focus-within:opacity-100">
            <div className="absolute top-1/2 left-1/2 aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2">
              <div className="h-full w-full animate-[spin_4.5s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,#38bdf8,#6366f1,#d946ef,#f97316,#facc15,#22c55e,#06b6d4,#38bdf8)]" />
            </div>
          </div>

          <div className="relative z-10 h-full w-full rounded-[calc(2rem-2px)] bg-white px-4 py-3 text-left">
            <label
              htmlFor="home-app-prompt"
              className="sr-only"
            >
              应用需求
            </label>
            <TextArea
              id="home-app-prompt"
              variant="borderless"
              autoSize={{ minRows: 2, maxRows: 8 }}
              maxLength={4000}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={promptPlaceholder}
              className="max-h-56 min-h-18 resize-none rounded-3xl px-2! pt-1! text-base! leading-7! text-slate-800! placeholder:text-slate-400!"
            />

            <div className="mt-1 flex justify-end">
              <Button
                htmlType="button"
                type="primary"
                shape="circle"
                onClick={handleCreateApp}
                aria-label="生成应用"
                icon={
                  <ArrowUp
                    className="size-5"
                    aria-hidden="true"
                  />
                }
                className="size-10! border-0! bg-linear-to-r from-sky-500 to-blue-600 shadow-md transition-all hover:-translate-y-0.5 hover:scale-105 hover:opacity-90"
              />
            </div>
          </div>
        </div>
      </section>
      {/* 精选案例 */}
      <FeaturedCasesSection />
    </main>
  )
}
