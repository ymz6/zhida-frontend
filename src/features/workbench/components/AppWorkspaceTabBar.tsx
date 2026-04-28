import { AppWindow, Code2, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AppWorkspaceTabKey = 'preview' | 'code' | 'settings'

const appWorkspaceTabs = [
  {
    key: 'preview',
    label: '预览',
    icon: AppWindow,
  },
  {
    key: 'code',
    label: '代码',
    icon: Code2,
  },
  {
    key: 'settings',
    label: '设置',
    icon: Settings,
  },
] satisfies Array<{
  key: AppWorkspaceTabKey
  label: string
  icon: LucideIcon
}>

export function AppWorkspaceTabBar({
  activeKey,
  onChange,
}: {
  activeKey: AppWorkspaceTabKey
  onChange: (key: AppWorkspaceTabKey) => void
}) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3">
      <div className="flex items-center gap-2">
        <div
          role="tablist"
          aria-label="工作台视图"
          className="inline-flex h-9 w-fit items-center gap-1 rounded-lg bg-slate-100/80 p-1 text-slate-500"
        >
          {appWorkspaceTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeKey === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                onClick={() => onChange(tab.key)}
                className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50'
                    : 'bg-transparent hover:bg-slate-200/50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className="size-3.5 shrink-0 transition-colors"
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
