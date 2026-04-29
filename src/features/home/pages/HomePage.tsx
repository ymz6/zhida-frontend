import { useCreateApp } from '@/api/generated/endpoints/app'
import { AppCard, type AppCardData } from '@/components/AppCard'
import { useAuthSessionStore } from '@/stores/auth-session'
import { useNavigate } from '@tanstack/react-router'
import { App, Button, Input } from 'antd'
import { ArrowUp, Compass, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

import { MyAppsSection } from '../components/MyAppsSection'

const { TextArea } = Input

const typewriterPrompts = [
  '创建一个咖啡店会员管理后台，包含订单、积分和活动配置',
  '生成一个企业官网，展示服务、案例、团队和联系方式',
  '做一个知识库助手，可以整理文档、检索答案和生成摘要',
]

const galleryApps: AppCardData[] = [
  {
    id: 'gallery-app-1',
    name: '企业服务官网',
    authorName: 'Zhida Studio',
    createdAt: '2026-04-12',
    coverUrl:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'gallery-app-2',
    name: '活动报名小程序后台',
    authorName: '王一诺',
    createdAt: '2026-04-18',
    coverUrl:
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'gallery-app-3',
    name: '团队 OKR 看板',
    authorName: '许航',
    createdAt: '2026-04-20',
  },
  {
    id: 'gallery-app-4',
    name: '商品库存分析台',
    authorName: '周沐',
    createdAt: '2026-04-23',
    coverUrl:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
  },
]

function useTypewriterPlaceholder(prompts: readonly string[]) {
  const [promptPlaceholder, setPromptPlaceholder] = useState('')

  useEffect(() => {
    if (prompts.length === 0) {
      setPromptPlaceholder('')
      return
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setPromptPlaceholder(prompts[0])
      return
    }

    let promptIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timeoutId: ReturnType<typeof window.setTimeout>

    const tick = () => {
      const prompt = prompts[promptIndex]
      const nextText = prompt.slice(0, charIndex)

      setPromptPlaceholder(nextText)

      if (!isDeleting && charIndex < prompt.length) {
        charIndex += 1
        timeoutId = window.setTimeout(tick, 70)
        return
      }

      if (!isDeleting && charIndex === prompt.length) {
        isDeleting = true
        timeoutId = window.setTimeout(tick, 1600)
        return
      }

      if (isDeleting && charIndex > 0) {
        charIndex -= 1
        timeoutId = window.setTimeout(tick, 28)
        return
      }

      isDeleting = false
      promptIndex = (promptIndex + 1) % prompts.length
      timeoutId = window.setTimeout(tick, 360)
    }

    timeoutId = window.setTimeout(tick, 300)

    return () => window.clearTimeout(timeoutId)
  }, [prompts])

  return promptPlaceholder
}

export function HomePage() {
  const promptPlaceholder = useTypewriterPlaceholder(typewriterPrompts)
  const navigate = useNavigate()
  const { message } = App.useApp()
  const createAppMutation = useCreateApp()
  const isAuthenticated = useAuthSessionStore((state) => Boolean(state.accessToken))
  const [prompt, setPrompt] = useState('')

  const handleCreateApp = async () => {
    const nextPrompt = prompt.trim()

    if (!nextPrompt) {
      message.warning('请先描述你想生成的应用')
      return
    }

    if (nextPrompt.length > 4000) {
      message.warning('需求描述不能超过 4000 个字符')
      return
    }

    try {
      const response = await createAppMutation.mutateAsync({
        data: {
          prompt: nextPrompt,
        },
      })
      const appId = response.data?.appId

      if (!appId) {
        message.error('后端未返回应用 ID')
        return
      }

      void navigate({
        to: '/workbench/$appId',
        params: { appId },
      })
    } catch (error) {
      message.error((error as { message?: string })?.message ?? '创建应用失败')
    }
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

        <div className="group relative mt-9 w-full max-w-3xl overflow-hidden rounded-4xl p-0.5 shadow-xl shadow-sky-900/5 transition-all duration-300">
          {/* Static Border (Visible when not focused) */}
          <div className="pointer-events-none absolute inset-0 rounded-4xl border border-slate-200/60 transition-opacity duration-300 group-focus-within:opacity-0" />

          {/* Animated Full Rainbow Flow (Visible on focus) */}
          <div className="pointer-events-none absolute -inset-full animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg_at_50%_50%,#ef4444,#eab308,#22c55e,#06b6d4,#3b82f6,#a855f7,#ec4899,#ef4444)] opacity-0 transition-opacity duration-700 ease-in-out group-focus-within:opacity-100" />

          {/* Inner Content Area */}
          <div className="relative h-full w-full rounded-[calc(2rem-2px)] bg-white/95 px-4 py-3 text-left backdrop-blur-xl">
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
                loading={createAppMutation.isPending}
                disabled={createAppMutation.isPending}
                onClick={() => void handleCreateApp()}
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

      {isAuthenticated && <MyAppsSection />}

      <section className="relative z-10 mx-auto mt-16 max-w-7xl">
        <h2 className="flex items-center text-2xl font-bold text-slate-950">
          <Compass className="mr-3 size-6 text-blue-500" />
          案例广场
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {galleryApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
