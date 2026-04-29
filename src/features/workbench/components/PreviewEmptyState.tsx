import { AppWindow } from 'lucide-react'

export function PreviewEmptyState({
  errorMessage,
  isGenerating,
}: {
  errorMessage?: string
  isGenerating?: boolean
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white backdrop-blur-sm">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
          <AppWindow className="size-6 text-indigo-500" />
        </div>
        <p className="text-base font-semibold text-slate-900">
          {errorMessage ? '生成未完成' : isGenerating ? '正在生成预览' : '等待加载预览'}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {errorMessage || '应用生成后，这里将实时展示运行效果和交互反馈。'}
        </p>
      </div>
    </div>
  )
}
