import { useState } from 'react'

import { AppWorkspaceTabBar } from './AppWorkspaceTabBar'
import type { AppWorkspaceTabKey } from './AppWorkspaceTabBar'
import { CodeContent } from './CodeContent'
import { DEFAULT_PREVIEW_DOCK_STATE, PreviewContent, type PreviewDockState } from './PreviewContent'
import { SettingsContent } from './SettingsContent'

export function AppWorkspacePanel({
  previewUrl,
  isGenerating,
  errorMessage,
}: {
  previewUrl?: string
  isGenerating?: boolean
  errorMessage?: string
}) {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<AppWorkspaceTabKey>('preview')
  const [previewDockState, setPreviewDockState] = useState<PreviewDockState>(
    DEFAULT_PREVIEW_DOCK_STATE,
  )

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <AppWorkspaceTabBar
        activeKey={activeWorkspaceTab}
        onChange={setActiveWorkspaceTab}
      />

      <div className="flex min-h-0 flex-1 flex-col bg-white">
        {activeWorkspaceTab === 'preview' && (
          <PreviewContent
            previewUrl={previewUrl}
            isGenerating={isGenerating}
            errorMessage={errorMessage}
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
