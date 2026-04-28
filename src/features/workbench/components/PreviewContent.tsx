import { AppWindow, ExternalLink, RotateCw } from 'lucide-react'

export function PreviewContent() {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-white">
      {/* 右上角悬浮操作按钮 */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="刷新"
        >
          <RotateCw className="size-4" />
          <span>刷新</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="在新窗口打开"
        >
          <ExternalLink className="size-4" />
          <span>新窗口打开</span>
        </button>
      </div>

      {/* iframe内容区 */}
      <div className="relative flex-1 min-h-0">
        <iframe
          title="当前应用预览"
          src="about:blank"
          className="h-full w-full border-0 bg-transparent"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white backdrop-blur-sm">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
              <AppWindow className="size-6 text-indigo-500" />
            </div>
            <p className="text-base font-semibold text-slate-900">等待加载预览</p>
            <p className="mt-2 text-sm text-slate-500">
              应用生成后，这里将实时展示运行效果和交互反馈。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
