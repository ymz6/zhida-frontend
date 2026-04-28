import { useState } from 'react'

import { AppWorkspaceTabBar } from './AppWorkspaceTabBar'
import type { AppWorkspaceTabKey } from './AppWorkspaceTabBar'
import { CodeContent } from './CodeContent'
import { PreviewContent } from './PreviewContent'
import { SettingsContent } from './SettingsContent'

export function AppWorkspacePanel() {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<AppWorkspaceTabKey>('preview')

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <AppWorkspaceTabBar
        activeKey={activeWorkspaceTab}
        onChange={setActiveWorkspaceTab}
      />

      <div className="flex min-h-0 flex-1 flex-col bg-white">
        {activeWorkspaceTab === 'preview' && <PreviewContent />}
        {activeWorkspaceTab === 'code' && <CodeContent />}
        {activeWorkspaceTab === 'settings' && <SettingsContent />}
      </div>
    </section>
  )
}
