import { Sender } from '@ant-design/x'
import { CircleAlert } from 'lucide-react'
import { useState } from 'react'

export function ConversationComposer({
  canIterate,
  isSubmitting,
  onSubmitIteration,
}: {
  canIterate?: boolean
  isSubmitting?: boolean
  onSubmitIteration: (prompt: string) => Promise<void>
}) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = async (value: string) => {
    const nextPrompt = value.trim()

    if (!nextPrompt) {
      return
    }

    await onSubmitIteration(nextPrompt)
    setPrompt('')
  }

  return (
    <div className="shrink-0 px-4 pb-4">
      {!canIterate && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
          <CircleAlert
            className="size-3.5"
            aria-hidden="true"
          />
          当前任务完成后可继续迭代
        </div>
      )}
      <Sender
        value={prompt}
        onChange={(v) => setPrompt(v)}
        onSubmit={(value) => void handleSubmit(value)}
        disabled={!canIterate}
        loading={isSubmitting}
        placeholder="描述想调整的地方，可以一步一步完善生成效果"
      />
    </div>
  )
}
