import { Tag } from 'antd'
import { Sparkles } from 'lucide-react'

import { getTaskStatusLabel, getTaskStepLabel } from '../utils/status'

export function TaskProgress({
  status,
  currentStep,
  isStreaming,
}: {
  status?: string
  currentStep?: string
  isStreaming?: boolean
}) {
  if (!status && !currentStep && !isStreaming) {
    return null
  }

  const stepLabel = getTaskStepLabel(currentStep)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-indigo-100">
      <Sparkles
        className="size-3.5 text-indigo-500"
        aria-hidden="true"
      />
      <span className="font-medium text-slate-700">{getTaskStatusLabel(status)}</span>
      {stepLabel && <span>当前步骤：{stepLabel}</span>}
      <Tag
        color={isStreaming ? 'processing' : status === 'FAILED' ? 'error' : 'default'}
        className="m-0"
      >
        {isStreaming ? '实时更新' : '已同步'}
      </Tag>
    </div>
  )
}
