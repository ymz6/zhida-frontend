import type { CreateAppRequest, CreateAppStreamMessage } from '@/api/generated/models'
import { useAuthSessionStore } from '@/stores/auth-session'
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { useNavigate } from '@tanstack/react-router'
import { App, Button, Input, Steps } from 'antd'
import { ArrowUp, Compass, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FeaturedCasesSection } from '../components/FeaturedCasesSection'
import { useTypewriterPlaceholder } from '../hooks/useTypewriterPlaceholder'

const { TextArea } = Input

const typewriterPrompts = [
  '创建一个咖啡店会员管理后台，包含订单、积分和活动配置',
  '生成一个企业官网，展示服务、案例、团队和联系方式',
]

const loginExpiredMessage = '登录状态已失效，请重新登录'

const createAppSteps = [
  {
    step: 'APP_CREATING',
    title: '创建应用',
    description: '正在创建应用',
  },
  {
    step: 'TEMPLATE_COPYING',
    title: '初始化项目模板',
    description: '正在初始化项目模板',
  },
  {
    step: 'DEPENDENCY_INSTALLING',
    title: '安装依赖',
    description: '正在安装依赖',
  },
  {
    step: 'DONE',
    title: '创建完成',
    description: '应用创建完成',
  },
] as const

type CreateAppStep = (typeof createAppSteps)[number]['step']
type CreateAppStatus = 'idle' | 'creating' | 'success'

const createAppStepIndexMap = createAppSteps.reduce(
  (acc, item, index) => {
    acc[item.step] = index
    return acc
  },
  {} as Record<CreateAppStep, number>,
)

function isCreateAppStep(step: CreateAppStreamMessage['step']): step is CreateAppStep {
  return Boolean(step && step in createAppStepIndexMap)
}

function getErrorMessage(error: unknown, fallback: string) {
  const responseErrorMessage =
    typeof error === 'object' && error && 'message' in error ? error.message : undefined

  return typeof responseErrorMessage === 'string' && responseErrorMessage.trim()
    ? responseErrorMessage
    : fallback
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function HomePage() {
  const navigate = useNavigate()
  const promptPlaceholder = useTypewriterPlaceholder(typewriterPrompts)
  const { message } = App.useApp()
  const accessToken = useAuthSessionStore((state) => state.accessToken)
  const clearSession = useAuthSessionStore((state) => state.clearSession)
  const [prompt, setPrompt] = useState('')
  const [createAppStatus, setCreateAppStatus] = useState<CreateAppStatus>('idle')
  const [createAppCurrentStep, setCreateAppCurrentStep] = useState<CreateAppStep>('APP_CREATING')
  const [createAppStreamMessage, setCreateAppStreamMessage] = useState('正在创建应用')
  const [dependencyInstallDotCount, setDependencyInstallDotCount] = useState(1)
  const createAppAbortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)
  const isCreateAppBusy = createAppStatus !== 'idle'
  const createAppCurrentStepIndex = createAppStepIndexMap[createAppCurrentStep]
  const isInstallingDependencies =
    createAppStatus === 'creating' && createAppCurrentStep === 'DEPENDENCY_INSTALLING'
  const currentCreateAppMessage = isInstallingDependencies
    ? `正在安装依赖${'.'.repeat(dependencyInstallDotCount)}`
    : createAppStreamMessage
  const createAppStepItems = createAppSteps.map((item, index) => ({
    title: item.title,
    content: index === createAppCurrentStepIndex ? currentCreateAppMessage : item.description,
  }))

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      createAppAbortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!isInstallingDependencies) {
      setDependencyInstallDotCount(1)
      return
    }

    const intervalId = window.setInterval(() => {
      setDependencyInstallDotCount((dotCount) => (dotCount >= 3 ? 1 : dotCount + 1))
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [isInstallingDependencies])

  const enterWorkbench = async (appId: string) => {
    try {
      if (!isMountedRef.current) {
        return
      }

      setCreateAppStatus('success')
      message.success('应用创建成功，即将进入工作台')
      await delay(800)

      if (!isMountedRef.current) {
        return
      }

      // 创建成功后进入对应应用工作台，后续生成过程由工作台承接展示。
      await navigate({
        to: '/workbench/$appId',
        params: { appId },
      })
    } catch (error) {
      if (!isMountedRef.current) {
        return
      }

      setCreateAppStatus('idle')
      message.error(getErrorMessage(error, '进入工作台失败，请稍后重试'))
    }
  }

  const handleCreateApp = async () => {
    if (isCreateAppBusy) {
      return
    }

    const nextPrompt = prompt.trim()

    if (!nextPrompt) {
      message.warning('请先描述你想生成的应用')
      return
    }

    if (nextPrompt.length > 4000) {
      message.warning('需求描述不能超过 4000 个字符')
      return
    }

    if (!accessToken) {
      message.warning('请先登录后创建应用')
      void navigate({ to: '/auth/login' })
      return
    }

    const createAppRequest: CreateAppRequest = {
      initPrompt: nextPrompt,
    }
    const abortController = new AbortController()
    let createdAppId: string | undefined
    let streamErrorMessage: string | undefined
    let isTerminalEventHandled = false

    createAppAbortControllerRef.current = abortController
    setCreateAppStatus('creating')
    setCreateAppCurrentStep('APP_CREATING')
    setCreateAppStreamMessage('正在创建应用')

    try {
      await fetchEventSource('/api/apps', {
        method: 'POST',
        headers: {
          accept: EventStreamContentType,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(createAppRequest),
        signal: abortController.signal,
        openWhenHidden: true,
        async onopen(response) {
          if (response.status === 401) {
            throw new Error(loginExpiredMessage)
          }

          if (!response.ok) {
            throw new Error('应用创建请求失败，请稍后重试')
          }

          const contentType = response.headers.get('content-type') ?? ''

          if (!contentType.startsWith(EventStreamContentType)) {
            throw new Error('应用创建接口未返回有效的 SSE 流')
          }
        },
        onmessage(event) {
          const eventData = event.data.trim()

          if (!eventData) {
            return
          }

          let streamMessage: CreateAppStreamMessage

          try {
            streamMessage = JSON.parse(eventData) as CreateAppStreamMessage
          } catch {
            throw new Error('应用创建进度解析失败，请稍后重试')
          }

          if (isTerminalEventHandled) {
            return
          }

          if (streamMessage.step === 'ERROR') {
            streamErrorMessage = streamMessage.message?.trim() || '应用创建失败，请稍后重试'
            isTerminalEventHandled = true
            abortController.abort()
            setCreateAppStatus('idle')
            message.error(streamErrorMessage)
            return
          }

          if (!isCreateAppStep(streamMessage.step)) {
            return
          }

          setCreateAppCurrentStep(streamMessage.step)
          setCreateAppStreamMessage(
            streamMessage.message?.trim() ||
              createAppSteps[createAppStepIndexMap[streamMessage.step]].description,
          )

          if (streamMessage.step === 'DONE') {
            createdAppId = String(streamMessage.appId ?? '').trim()
            isTerminalEventHandled = true
            abortController.abort()

            if (!createdAppId) {
              setCreateAppStatus('idle')
              message.error('应用创建完成但未返回应用 ID，请稍后重试')
              return
            }

            void enterWorkbench(createdAppId)
          }
        },
        onclose() {
          if (!createdAppId && !streamErrorMessage && !abortController.signal.aborted) {
            streamErrorMessage = '应用创建连接已断开，请稍后重试'
          }
        },
        onerror(error) {
          throw error
        },
      })

      if (!isMountedRef.current) {
        return
      }

      if (isTerminalEventHandled) {
        return
      }

      if (streamErrorMessage) {
        throw new Error(streamErrorMessage)
      }

      if (!createdAppId) {
        throw new Error('应用创建完成但未返回应用 ID，请稍后重试')
      }

      await enterWorkbench(createdAppId)
    } catch (error) {
      const fallbackErrorMessage = '应用创建失败，请稍后重试'
      const errorMessage = getErrorMessage(error, fallbackErrorMessage)

      if (!isMountedRef.current) {
        return
      }

      if (isTerminalEventHandled) {
        return
      }

      if (errorMessage === loginExpiredMessage) {
        clearSession()
        void navigate({ to: '/auth/login' })
      }

      setCreateAppStatus('idle')
      message.error(errorMessage)
    } finally {
      if (createAppAbortControllerRef.current === abortController) {
        createAppAbortControllerRef.current = null
      }
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-10rem)] overflow-hidden py-10 sm:py-12">
      {isCreateAppBusy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-6 text-center shadow-2xl shadow-slate-950/20">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-sky-50 text-sky-600 ring-8 ring-sky-50/70">
              <Sparkles
                className="size-6 animate-pulse"
                aria-hidden="true"
              />
            </div>
            <div className="mt-5 text-base font-semibold text-slate-950">
              {createAppStatus === 'success'
                ? '应用创建成功，正在进入工作台'
                : '应用创建中，请不要离开此页面'}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              {createAppStatus === 'success'
                ? '稍等片刻，马上为你打开应用工作台。'
                : currentCreateAppMessage}
            </div>
            <Steps
              orientation="vertical"
              current={createAppCurrentStepIndex}
              status={createAppStatus === 'success' ? 'finish' : 'process'}
              items={createAppStepItems}
              className="mx-auto mt-6 max-w-xs text-left"
            />
          </div>
        </div>
      ) : null}
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
              disabled={isCreateAppBusy}
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
                loading={isCreateAppBusy}
                disabled={isCreateAppBusy}
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
