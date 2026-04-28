import { Bubble, Sender, ThoughtChain } from '@ant-design/x'
import { Bot, Sparkles, UserRound } from 'lucide-react'
import { useState } from 'react'

const generationSteps = [
  {
    title: '需求分析',
    description: '整理应用目标、页面结构与核心功能',
    status: 'success' as const,
  },
  {
    title: '页面生成',
    description: '生成首页、数据面板和配置页面',
    status: 'loading' as const,
  },
  {
    title: '组件更新',
    description: '等待根据预览反馈继续调整',
  },
  {
    title: '资源处理',
    description: '等待处理图片、图标与静态资源',
  },
]

const roles = {
  user: {
    placement: 'end' as const,
    avatar: (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <UserRound
          className="size-4"
          aria-hidden="true"
        />
      </div>
    ),
  },
  assistant: {
    placement: 'start' as const,
    avatar: (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <Bot
          className="size-4"
          aria-hidden="true"
        />
      </div>
    ),
  },
}

export function ConversationPanel() {
  const [prompt, setPrompt] = useState('')

  const items = [
    {
      key: '1',
      role: 'user',
      content: '创建一个咖啡店会员管理后台，包含订单、积分和活动配置，整体风格要清爽易用。',
    },
    {
      key: '2',
      role: 'assistant',
      content:
        '我会先拆解应用结构，再生成基础页面和可预览版本。当前会优先搭建会员、订单、积分和活动四个核心模块。',
    },
    {
      key: '3',
      role: 'assistant',
      content: (
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles
              className="size-4 text-indigo-500"
              aria-hidden="true"
            />
            <h3 className="text-sm font-semibold text-slate-900">生成过程</h3>
          </div>
          <ThoughtChain items={generationSteps} />
        </div>
      ),
    },
    {
      key: '4',
      role: 'assistant',
      content: '已完成需求分析，正在生成页面框架。右侧应用工作区会承载当前应用的实时运行效果。',
    },
  ]

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4">
        <Bubble.List
          items={items}
          role={roles}
        />
      </div>

      <div className="shrink-0 px-4 pb-4">
        <Sender
          value={prompt}
          onChange={(v) => setPrompt(v)}
          onSubmit={() => setPrompt('')}
          placeholder="描述越详细，页面越具体，可以一步一步完善生成效果"
        />
      </div>
    </section>
  )
}
