import { Button, Empty } from 'antd'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function PublicCasePreviewFrame({ deployUrl }: { deployUrl?: string }) {
  const [frameKey, setFrameKey] = useState(0)
  const [hasFrameError, setHasFrameError] = useState(false)
  const hasDeployUrl = Boolean(deployUrl?.trim())

  const refreshFrame = () => {
    setHasFrameError(false)
    setFrameKey((value) => value + 1)
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3">
        <span className="text-sm font-medium text-slate-700">应用预览</span>
        {hasDeployUrl ? (
          <Button
            icon={<RefreshCw className="size-4" />}
            onClick={refreshFrame}
            className="h-8 rounded-full!"
          >
            刷新
          </Button>
        ) : null}
      </div>

      {!hasDeployUrl ? (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50/60 p-6">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="应用暂不可预览"
          />
        </div>
      ) : hasFrameError ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-slate-50/60 p-6">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="应用预览加载失败"
          />
          <Button
            className="rounded-full!"
            onClick={refreshFrame}
          >
            重试
          </Button>
        </div>
      ) : (
        <iframe
          key={frameKey}
          title="应用预览"
          src={deployUrl}
          onError={() => setHasFrameError(true)}
          className="min-h-0 flex-1 border-0 bg-white"
          sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
        />
      )}
    </section>
  )
}
