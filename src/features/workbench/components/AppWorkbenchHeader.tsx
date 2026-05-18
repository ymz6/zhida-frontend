import zhidaLogo from '@/assets/zhida-logo.svg'
import { Link } from '@tanstack/react-router'
import { Button, Dropdown, Layout } from 'antd'
import { Download, MoreHorizontal } from 'lucide-react'
import type { MenuProps } from 'antd'

const headerButtonClassName = 'h-8! rounded-full! px-3! text-sm! font-medium!'

export function AppWorkbenchHeader({ appName }: { appName?: string }) {
  const moreMenuItems: MenuProps['items'] = [
    {
      key: 'download',
      disabled: true,
      icon: (
        <Download
          className="size-4"
          aria-hidden="true"
        />
      ),
      label: '下载代码',
    },
  ]

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
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Dropdown
          menu={{ items: moreMenuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button
            type="default"
            icon={
              <MoreHorizontal
                className="size-4"
                aria-hidden="true"
              />
            }
            className={headerButtonClassName}
          >
            更多
          </Button>
        </Dropdown>
      </div>
    </Layout.Header>
  )
}
