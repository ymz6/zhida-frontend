import { useParams } from '@tanstack/react-router'
import { Layout, Splitter } from 'antd'
import { useMemo } from 'react'

import { AppWorkbenchHeader } from '../components/AppWorkbenchHeader'
import { AppWorkspacePanel } from '../components/AppWorkspacePanel'
import { ConversationPanel } from '../components/ConversationPanel'
import { getMockWorkbenchData } from '../mocks/workbenchMock'

export function AppWorkbenchPage() {
  const { appId } = useParams({ from: '/workbench_/$appId' })
  const mockData = useMemo(() => getMockWorkbenchData(appId), [appId])
  const { appDetail, persistedMessages } = mockData

  const isTaskRunning = false
  const canSubmitMessage = false

  const handleSubmitMessage = () => {
    // 静态展示模式下不创建本地临时消息，等待后续后端接口接回。
    return false
  }

  return (
    <Layout className="fixed inset-0 z-0 flex overflow-hidden bg-slate-100 text-slate-950">
      <AppWorkbenchHeader appName={appDetail.name} />

      <Layout.Content className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <Splitter className="h-full min-h-0 flex-1 overflow-hidden bg-white">
          <Splitter.Panel
            defaultSize={380}
            min={320}
            max="48%"
          >
            <ConversationPanel
              key={appId}
              persistedMessages={persistedMessages}
              streamMessages={mockData.streamMessages}
              isLoadingMessages={false}
              hasMoreMessages={false}
              isLoadingMoreMessages={false}
              canCode={canSubmitMessage}
              isSubmitting={false}
              previewUrl={appDetail.previewUrl}
              isVisualEditMode={false}
              selectedVisualEditElement={null}
              onSubmitMessage={handleSubmitMessage}
            />
          </Splitter.Panel>
          <Splitter.Panel min={420}>
            <AppWorkspacePanel
              key={appId}
              previewUrl={appDetail.previewUrl}
              previewReloadKey={0}
              isGenerating={isTaskRunning}
              errorMessage={appDetail.errorMessage}
              isVisualEditMode={false}
            />
          </Splitter.Panel>
        </Splitter>
      </Layout.Content>
    </Layout>
  )
}
