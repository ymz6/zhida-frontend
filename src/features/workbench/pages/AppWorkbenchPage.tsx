import { useParams } from '@tanstack/react-router'
import { App, Alert, Layout, Splitter } from 'antd'
import { useMemo, useState } from 'react'

import { AppWorkbenchHeader } from '../components/AppWorkbenchHeader'
import { AppWorkspacePanel } from '../components/AppWorkspacePanel'
import { ConversationPanel } from '../components/ConversationPanel'
import { DeploymentInfoCard } from '../components/DeploymentInfoCard'
import { getMockWorkbenchData } from '../mocks/workbenchMock'
import type { WorkbenchChatMessageInfo } from '../utils/conversationTimeline'
import { buildVisualEditPrompt, type VisualEditElement } from '../utils/visualEdit'

export function AppWorkbenchPage() {
  const { appId } = useParams({ from: '/workbench_/$appId' })
  const { message, modal } = App.useApp()
  const [isVisualEditMode, setIsVisualEditMode] = useState(false)
  const [selectedVisualEditElement, setSelectedVisualEditElement] =
    useState<VisualEditElement | null>(null)
  const [streamMessages, setStreamMessages] = useState<WorkbenchChatMessageInfo[]>([])
  const mockData = useMemo(() => getMockWorkbenchData(appId), [appId])
  const { appDetail, persistedMessages } = mockData

  const isTaskRunning = false
  const canCode = true
  const canVisualEdit = Boolean(appDetail.previewUrl)
  const isDeploying = false
  const canDeploy = true
  const deployBlockedReason = undefined
  const effectiveDeployStatus = appDetail.deployStatus
  const hasDeployUrl = Boolean(appDetail.deployUrl)
  const allStreamMessages = [...mockData.streamMessages, ...streamMessages]

  const handleLoadMoreMessages = async () => {
    message.info('当前为示例数据，暂无更多历史消息')
  }

  const handleVisualEditModeChange = (enabled: boolean) => {
    if (!enabled) {
      setIsVisualEditMode(false)
      setSelectedVisualEditElement(null)
      return
    }

    if (!canVisualEdit) {
      message.warning('预览加载后才能使用编辑')
      return
    }

    setIsVisualEditMode(true)
    setSelectedVisualEditElement(null)
  }

  const handleVisualEditElementSelect = (element: VisualEditElement) => {
    setSelectedVisualEditElement(element)
  }

  const handleSubmitMessage = (prompt: string) => {
    let requestPrompt = prompt

    if (isVisualEditMode) {
      if (!selectedVisualEditElement) {
        message.warning('请先在预览中选择要编辑的元素')
        return false
      }

      requestPrompt = buildVisualEditPrompt(prompt, selectedVisualEditElement)
    }

    const now = new Date().toISOString()
    const messageId = `mock-${Date.now()}`

    setStreamMessages((messages) => [
      ...messages,
      {
        id: `${messageId}-user`,
        appId,
        role: 'USER',
        contentType: 'TEXT',
        content: requestPrompt,
        createdAt: now,
      },
      {
        id: `${messageId}-assistant`,
        appId,
        role: 'ASSISTANT',
        contentType: 'TEXT',
        content: '这是静态生成示例，当前不会创建后端任务或请求 SSE。',
        createdAt: now,
      },
    ])

    if (isVisualEditMode) {
      setIsVisualEditMode(false)
      setSelectedVisualEditElement(null)
    }

    return true
  }

  const handleConfirmDeploy = () => {
    modal.confirm({
      title: '部署项目？',
      content: '当前为静态示例模式，不会触发真实部署。',
      okText: '知道了',
      cancelText: '取消',
      centered: true,
      onOk: () => message.info('静态示例模式不会请求部署接口'),
    })
  }

  const handleCopyDeployUrl = async (url: string | undefined) => {
    if (!url) {
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      message.success('正式地址已复制')
    } catch {
      message.error('复制失败，请手动复制链接')
    }
  }

  const deployInfoPopoverContent = hasDeployUrl ? (
    <DeploymentInfoCard
      deployUrl={appDetail.deployUrl}
      deployStatus={effectiveDeployStatus}
      deployedAt={appDetail.deployedAt}
      blockedReason={deployBlockedReason}
      onCopy={(url) => void handleCopyDeployUrl(url)}
    />
  ) : undefined

  return (
    <Layout className="fixed inset-0 z-0 flex overflow-hidden bg-slate-100 text-slate-950">
      <AppWorkbenchHeader
        appName={appDetail.name}
        deployBlockedReason={deployBlockedReason}
        isDeployPending={isDeploying}
        canDeploy={canDeploy}
        hasDeployUrl={hasDeployUrl}
        deployInfoPopoverContent={deployInfoPopoverContent}
        onConfirmDeploy={handleConfirmDeploy}
      />

      <Layout.Content className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {appDetail.deployErrorMessage && (
          <Alert
            showIcon
            type="error"
            title="最近一次部署失败"
            description={appDetail.deployErrorMessage}
            className="shrink-0 rounded-none! border-x-0! border-t-0!"
          />
        )}

        <Splitter className="h-full min-h-0 flex-1 overflow-hidden bg-white">
          <Splitter.Panel
            defaultSize={380}
            min={320}
            max="48%"
          >
            <ConversationPanel
              key={appId}
              persistedMessages={persistedMessages}
              streamMessages={allStreamMessages}
              isLoadingMessages={false}
              hasMoreMessages={false}
              isLoadingMoreMessages={false}
              canCode={canCode}
              isSubmitting={false}
              previewUrl={appDetail.previewUrl}
              isVisualEditMode={isVisualEditMode}
              selectedVisualEditElement={selectedVisualEditElement}
              onLoadMoreMessages={handleLoadMoreMessages}
              onVisualEditModeChange={handleVisualEditModeChange}
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
              isVisualEditMode={isVisualEditMode}
              onVisualEditModeChange={handleVisualEditModeChange}
              onVisualEditElementSelect={handleVisualEditElementSelect}
            />
          </Splitter.Panel>
        </Splitter>
      </Layout.Content>

    </Layout>
  )
}
