import { Button } from 'antd'
import { Copy, ExternalLink, Rocket } from 'lucide-react'

import { openExternalUrl, type DeployResult } from '../utils/deploy'
import { getDeployStatusLabel } from '../utils/status'

export function DeploymentInfoCard({
  deployedAt,
  deployStatus,
  deployUrl,
  blockedReason,
  onCopy,
}: DeployResult & {
  blockedReason?: string
  onCopy: (url: string | undefined) => void
}) {
  return (
    <div className="w-80 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <Rocket
            className="size-4"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">应用部署信息</p>
          <p className="mt-1 text-xs text-slate-500">
            {deployStatus ? getDeployStatusLabel(deployStatus) : '已生成正式访问地址'}
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
        <div>
          <p className="text-xs font-medium text-slate-500">部署时间</p>
          <p className="mt-1 text-sm text-slate-800">{deployedAt || '暂无记录'}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">访问 URL</p>
          <p className="mt-1 break-all font-mono text-xs leading-5 text-slate-800">
            {deployUrl || '暂无正式地址'}
          </p>
        </div>
      </div>

      {blockedReason && <p className="text-xs text-amber-600">{blockedReason}</p>}

      <div className="flex justify-end gap-2">
        <Button
          size="small"
          disabled={!deployUrl}
          onClick={() => onCopy(deployUrl)}
          icon={
            <Copy
              className="size-3.5"
              aria-hidden="true"
            />
          }
        >
          复制 URL
        </Button>
        <Button
          size="small"
          type="primary"
          disabled={!deployUrl}
          onClick={() => openExternalUrl(deployUrl)}
          icon={
            <ExternalLink
              className="size-3.5"
              aria-hidden="true"
            />
          }
        >
          打开 URL
        </Button>
      </div>
    </div>
  )
}
