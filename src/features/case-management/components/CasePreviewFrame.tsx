import { Alert, Button, Empty } from 'antd'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function CasePreviewFrame({
  deployUrl,
  className = '',
}: {
  deployUrl?: string
  className?: string
}) {
  const [frameKey, setFrameKey] = useState(0)
  const hasDeployUrl = Boolean(deployUrl?.trim())

  if (!hasDeployUrl) {
    return (
      <div
        className={`flex min-h-80 items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-6 ${className}`}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="应用尚未部署，不能作为公开案例展示"
        />
      </div>
    )
  }

  return (
    <section
      className={`flex min-h-130 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <span className="min-w-0 truncate text-sm font-medium text-slate-700" />
        <div className="flex shrink-0 gap-2">
          <Button
            icon={<RefreshCw className="size-4" />}
            onClick={() => setFrameKey((value) => value + 1)}
          >
            刷新
          </Button>
          <Button
            icon={<ExternalLink className="size-4" />}
            href={deployUrl}
            target="_blank"
            rel="noreferrer"
          >
            新窗口打开
          </Button>
        </div>
      </div>
      <iframe
        key={frameKey}
        title="应用运行效果"
        src={deployUrl}
        className="min-h-0 flex-1 border-0 bg-white"
        sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
      />
    </section>
  )
}
