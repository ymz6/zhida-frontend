import { useEffect, useState } from 'react'

import { AppWorkspaceTabBar } from './AppWorkspaceTabBar'
import type { AppWorkspaceTabKey } from './AppWorkspaceTabBar'
import type { VisualEditElement } from '../utils/visualEdit'
import { CodeContent } from './CodeContent'
import { DEFAULT_PREVIEW_DOCK_STATE, PreviewContent, type PreviewDockState } from './PreviewContent'
import { SettingsContent } from './SettingsContent'

export function AppWorkspacePanel({
  previewUrl,
  previewReloadKey,
  isGenerating,
  errorMessage,
  isVisualEditMode,
  onVisualEditModeChange,
  onVisualEditElementSelect,
}: {
  previewUrl?: string
  previewReloadKey?: number
  isGenerating?: boolean
  errorMessage?: string
  isVisualEditMode?: boolean
  onVisualEditModeChange?: (enabled: boolean) => void
  onVisualEditElementSelect?: (element: VisualEditElement) => void
}) {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<AppWorkspaceTabKey>('preview')
  const [previewDockState, setPreviewDockState] = useState<PreviewDockState>(
    DEFAULT_PREVIEW_DOCK_STATE,
  )

  const handleWorkspaceTabChange = (key: AppWorkspaceTabKey) => {
    setActiveWorkspaceTab(key)

    if (key !== 'preview' && isVisualEditMode) {
      // 离开预览页签后无法继续点选 iframe 元素，需要同步关闭编辑模式。
      onVisualEditModeChange?.(false)
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
            previewUrl={previewUrl}
            previewReloadKey={previewReloadKey}
            isGenerating={isGenerating}
            errorMessage={errorMessage}
            isVisualEditMode={isVisualEditMode}
            onVisualEditElementSelect={onVisualEditElementSelect}
            previewDockState={previewDockState}
            onPreviewDockStateChange={setPreviewDockState}
          />
        )}
        {activeWorkspaceTab === 'code' && <CodeContent />}
        {activeWorkspaceTab === 'settings' && <SettingsContent />}
      </div>
    </section>
  )
}
