import { Button, Card, Input, Skeleton } from 'antd'
import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

const { TextArea } = Input

const typewriterPrompts = [
  '创建一个咖啡店会员管理后台，包含订单、积分和活动配置',
  '生成一个企业官网，展示服务、案例、团队和联系方式',
  '做一个知识库助手，可以整理文档、检索答案和生成摘要',
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

  return (
    <main className="min-h-[calc(100vh-10rem)] py-10 sm:py-12">
      <section className="mx-auto flex min-h-124 max-w-5xl flex-col items-center justify-center text-center">
        <h1 className="text-balance font-['Microsoft_YouYuan','YouYuan','幼圆','Microsoft_YaHei_UI',sans-serif] text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
          说出想法，生成应用
        </h1>
        <p className="mt-3 max-w-2xl font-['JetBrains_Mono','Fira_Code','Menlo','Monaco','Consolas',monospace] text-sm leading-7 text-slate-600 sm:text-base">
          Create wonderful code, build a wonderful world
        </p>

        <div className="mt-9 w-full max-w-3xl rounded-4xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
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
            placeholder={promptPlaceholder}
            className="max-h-56 min-h-18 resize-none rounded-3xl px-2! pt-1! text-base! leading-7! text-slate-800! placeholder:text-slate-400!"
          />

          <div className="mt-1 flex justify-end">
            <Button
              htmlType="button"
              type="primary"
              shape="circle"
              aria-label="生成应用"
              icon={
                <ArrowUp
                  className="size-5"
                  aria-hidden="true"
                />
              }
              className="size-10! bg-slate-950!"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl">
        <h2 className="text-2xl font-bold text-slate-950">我的作品</h2>

        <Card className="mt-5 rounded-3xl shadow-sm">
          <Skeleton
            active
            round
            paragraph={{ rows: 3 }}
          />
        </Card>
      </section>

      <section className="mx-auto mt-16 max-w-7xl">
        <h2 className="text-2xl font-bold text-slate-950">案例广场</h2>

        <Card className="mt-5 rounded-3xl shadow-sm">
          <Skeleton
            active
            round
            paragraph={{ rows: 4 }}
          />
        </Card>
      </section>
    </main>
  )
}
