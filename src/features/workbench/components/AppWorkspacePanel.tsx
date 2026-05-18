import { useEffect, useState } from 'react'
import type { AppVO } from '@/api/generated/models'

import { useWorkbenchRuntimeStore } from '../stores/useWorkbenchRuntimeStore'
import { AppWorkspaceTabBar } from './AppWorkspaceTabBar'
import type { AppWorkspaceTabKey } from './AppWorkspaceTabBar'
import { CodeContent } from './CodeContent'
import { PreviewContent } from './PreviewContent'
import { SettingsContent } from './SettingsContent'

export function AppWorkspacePanel({ app, errorMessage }: { app?: AppVO; errorMessage?: string }) {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<AppWorkspaceTabKey>('preview')
  const isVisualEditMode = useWorkbenchRuntimeStore((state) => state.isVisualEditMode)
  const setVisualEditMode = useWorkbenchRuntimeStore((state) => state.setVisualEditMode)

  const handleWorkspaceTabChange = (key: AppWorkspaceTabKey) => {
    setActiveWorkspaceTab(key)

    if (key !== 'preview' && isVisualEditMode) {
      // 离开预览页签后无法继续点选 iframe 元素，需要同步关闭编辑模式。
      setVisualEditMode(false)
    }
  }

  useEffect(() => {
    if (isVisualEditMode) {
      // 开启可视化编辑时确保右侧展示的是可交互预览。
      setActiveWorkspaceTab('preview')
    }
  }, [isVisualEditMode])

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <AppWorkspaceTabBar
        activeKey={activeWorkspaceTab}
        onChange={handleWorkspaceTabChange}
      />

      <div className="flex min-h-0 flex-1 flex-col bg-white">
        {activeWorkspaceTab === 'preview' && (
          <PreviewContent
            appId={app?.id}
            errorMessage={errorMessage}
          />
        )}
        {activeWorkspaceTab === 'code' && <CodeContent appId={app?.id} />}
        {activeWorkspaceTab === 'settings' && <SettingsContent app={app} />}
      </div>
    </section>
  )
}
