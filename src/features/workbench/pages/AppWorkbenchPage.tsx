import zhidaLogo from '@/assets/zhida-logo.svg'
import { Link } from '@tanstack/react-router'
import { Layout, Splitter } from 'antd'
import { Download, Rocket } from 'lucide-react'

import { AppWorkspacePanel } from '../components/AppWorkspacePanel'
import { ConversationPanel } from '../components/ConversationPanel'

export function AppWorkbenchPage() {
  return (
    <Layout className="fixed inset-0 z-0 flex overflow-hidden bg-slate-100 text-slate-950">
      <Layout.Header className="flex h-14! shrink-0 items-center justify-between gap-4 overflow-hidden border-b border-slate-200 bg-white px-4! leading-normal! sm:px-5!">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            className="flex size-9 shrink-0 hover:opacity-80 transition-opacity"
            title="返回首页"
          >
            <img
              src={zhidaLogo}
              alt="智搭 Logo"
              className="h-full! w-full! max-w-full! object-contain"
            />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-5 text-slate-950">应用名称</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Download className="size-4" />
            <span>下载代码</span>
          </button>
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-3 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
          >
            <Rocket className="size-4" />
            <span>部署项目</span>
          </button>
        </div>
      </Layout.Header>

      <Layout.Content className="min-h-0 flex-1 overflow-hidden bg-white">
        <Splitter className="h-full w-full overflow-hidden bg-white">
          <Splitter.Panel
            defaultSize="380px"
            min="320px"
            max="48%"
          >
            <ConversationPanel />
          </Splitter.Panel>
          <Splitter.Panel min="420px">
            <AppWorkspacePanel />
          </Splitter.Panel>
        </Splitter>
      </Layout.Content>
    </Layout>
  )
}
