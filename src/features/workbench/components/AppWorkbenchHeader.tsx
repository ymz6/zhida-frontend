import zhidaLogo from '@/assets/zhida-logo.svg'
import { Link } from '@tanstack/react-router'
import { Button, Layout, Popover, Tag, Tooltip } from 'antd'
import { Download, Rocket, Send } from 'lucide-react'
import type { ReactNode } from 'react'

import { getAppStatusLabel, getDeployStatusColor, getDeployStatusLabel } from '../utils/status'

const headerButtonClassName = 'h-8! rounded-md! px-3! text-sm! font-medium!'

export function AppWorkbenchHeader({
  appName,
  appStatus,
  deployStatus,
  deployBlockedReason,
  isTaskRunning,
  isDeployPending,
  canDeploy,
  hasDeployUrl,
  canSubmitCase,
  deployInfoPopoverContent,
  onOpenSubmitCase,
  onConfirmDeploy,
}: {
  appName?: string
  appStatus?: string
  deployStatus?: string
  deployBlockedReason?: string
  isTaskRunning?: boolean
  isDeployPending?: boolean
  canDeploy?: boolean
  hasDeployUrl?: boolean
  canSubmitCase?: boolean
  deployInfoPopoverContent?: ReactNode
  onOpenSubmitCase?: () => void
  onConfirmDeploy: () => void
}) {
  return (
    <Layout.Header className="flex h-14! shrink-0 items-center justify-between gap-4 overflow-hidden border-b border-slate-200 bg-white px-4! leading-normal! sm:px-5!">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/"
          className="flex size-9 shrink-0 transition-opacity hover:opacity-80"
          title="返回首页"
        >
          <img
            src={zhidaLogo}
            alt="智搭 Logo"
            className="h-full! w-full! max-w-full! object-contain"
          />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-5 text-slate-950">
            {appName || '应用工作台'}
          </h1>
          <div className="mt-0.5 flex items-center gap-2">
            <Tag
              color={appStatus === 'FAILED' ? 'error' : isTaskRunning ? 'processing' : 'default'}
              className="m-0"
            >
              {getAppStatusLabel(appStatus)}
            </Tag>
            {deployStatus && (
              <Tag
                color={getDeployStatusColor(deployStatus)}
                className="m-0"
              >
                {getDeployStatusLabel(deployStatus)}
              </Tag>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          disabled
          icon={
            <Download
              className="size-4"
              aria-hidden="true"
            />
          }
          className={headerButtonClassName}
        >
          下载代码
        </Button>

        {canSubmitCase && onOpenSubmitCase ? (
          <Button
            type="default"
            icon={
              <Send
                className="size-4"
                aria-hidden="true"
              />
            }
            onClick={onOpenSubmitCase}
            className={headerButtonClassName}
          >
            提交案例
          </Button>
        ) : null}

        {hasDeployUrl && deployInfoPopoverContent ? (
          <Popover
            title={null}
            content={deployInfoPopoverContent}
            placement="bottomRight"
            trigger="hover"
            mouseEnterDelay={0.15}
          >
            <span className="inline-flex">
              <Button
                type="default"
                loading={isDeployPending}
                disabled={!canDeploy}
                onClick={onConfirmDeploy}
                icon={
                  <Rocket
                    className="size-4"
                    aria-hidden="true"
                  />
                }
                className={headerButtonClassName}
              >
                {isDeployPending ? '部署中' : '重新部署'}
              </Button>
            </span>
          </Popover>
        ) : (
          <Tooltip title={canDeploy ? undefined : deployBlockedReason}>
            <span className="inline-flex">
              <Button
                type="primary"
                loading={isDeployPending}
                disabled={!canDeploy}
                onClick={onConfirmDeploy}
                icon={
                  <Rocket
                    className="size-4"
                    aria-hidden="true"
                  />
                }
                className={headerButtonClassName}
              >
                {isDeployPending ? '部署中' : '部署项目'}
              </Button>
            </span>
          </Tooltip>
        )}
      </div>
    </Layout.Header>
  )
}
