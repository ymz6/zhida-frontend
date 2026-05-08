import {
  getGetAppQueryKey,
  getListAppMessagesQueryKey,
  listAppMessages,
  type GetAppQueryResult,
  useDeployApp,
  useGetApp,
} from '@/api/generated/endpoints/app'
import { ChatRequestMode, type AppChatMessageInfo, type AppDetail } from '@/api/generated/models'
import { SubmitCaseModal } from '@/features/app-case/components/SubmitCaseModal'
import { queryClient } from '@/libs/query-client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { App, Alert, Layout, Skeleton, Splitter } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AppWorkbenchHeader } from '../components/AppWorkbenchHeader'
import { AppWorkspacePanel } from '../components/AppWorkspacePanel'
import { ConversationPanel } from '../components/ConversationPanel'
import { DeploymentInfoCard } from '../components/DeploymentInfoCard'
import { useAppChatStream } from '../hooks/useAppChatStream'
import { isActiveAppStatus } from '../types'
import type { WorkbenchChatMessageInfo } from '../utils/conversationTimeline'
import { updateAppDetailDeployResult } from '../utils/deploy'
import { clearInitialAppPrompt, readInitialAppPrompt } from '../utils/initialPrompt'
import { buildVisualEditPrompt, type VisualEditElement } from '../utils/visualEdit'

const CHAT_MESSAGES_LIMIT = 50

function hasRunningAppStatus(appDetail: AppDetail | undefined) {
  return (
    appDetail?.status === 'GENERATING' ||
    appDetail?.status === 'BUILDING' ||
    appDetail?.status === 'ITERATING' ||
    Boolean(appDetail?.status === 'CREATING' && appDetail.latestTaskId)
  )
}

export function AppWorkbenchPage({ appId }: { appId: string }) {
  const { message, modal } = App.useApp()
  const [previewReloadKey, setPreviewReloadKey] = useState(0)
  const [isSubmitCaseModalOpen, setIsSubmitCaseModalOpen] = useState(false)
  const [isVisualEditMode, setIsVisualEditMode] = useState(false)
  const [selectedVisualEditElement, setSelectedVisualEditElement] =
    useState<VisualEditElement | null>(null)
  const initialPromptStartedRef = useRef(false)
  const resumedTaskIdsRef = useRef(new Set<string>())
  const appQuery = useGetApp(appId)

  const messagesQueryKey = useMemo(
    () => [...getListAppMessagesQueryKey(appId), 'cursor', { limit: CHAT_MESSAGES_LIMIT }] as const,
    [appId],
  )
  const messagesQuery = useInfiniteQuery({
    queryKey: messagesQueryKey,
    initialPageParam: '',
    refetchOnWindowFocus: false,
    queryFn: ({ pageParam, signal }) =>
      listAppMessages(
        appId,
        {
          request: {
            limit: CHAT_MESSAGES_LIMIT,
          },
        },
        {
          params: {
            limit: CHAT_MESSAGES_LIMIT,
            before: pageParam || undefined,
          },
        },
        signal,
      ),
    getNextPageParam: (lastPage, _allPages, lastPageParam, allPageParams) => {
      const nextCursor = lastPage.data?.nextCursor

      if (
        !lastPage.data?.hasMore ||
        !nextCursor ||
        nextCursor === lastPageParam ||
        allPageParams.includes(nextCursor)
      ) {
        return undefined
      }

      return nextCursor
    },
  })
  const deployMutation = useDeployApp()

  const handleStreamError = useCallback(
    (errorMessage: string) => {
      message.error(errorMessage)
    },
    [message],
  )

  const handleStreamSettled = useCallback(
    ({ mode, status }: { mode: ChatRequestMode; status?: string }) => {
      if (mode === ChatRequestMode.CHAT) {
        return
      }

      void queryClient.invalidateQueries({ queryKey: getGetAppQueryKey(appId) })
      void queryClient.invalidateQueries({ queryKey: ['/apps/mine'] })

      if (status !== 'FAILED') {
        setPreviewReloadKey((key) => key + 1)
      }
    },
    [appId],
  )

  const appChatStream = useAppChatStream({
    appId,
    onError: handleStreamError,
    onSettled: handleStreamSettled,
  })

  const appDetail = appQuery.data?.data

  const persistedMessages = useMemo(
    () => [...(messagesQuery.data?.pages ?? [])].reverse().flatMap((page) => page.data?.list ?? []),
    [messagesQuery.data?.pages],
  )

  const streamMessages = useMemo<WorkbenchChatMessageInfo[]>(
    () =>
      appChatStream.streamMessages.map((streamMessage) => ({
        id: streamMessage.messageId ?? streamMessage.key,
        appId: streamMessage.appId,
        taskId: streamMessage.taskId,
        role: streamMessage.role,
        messageType: streamMessage.messageType,
        content: streamMessage.content,
        metadata: streamMessage.metadata,
        createdAt: streamMessage.createdAt,
        streaming: streamMessage.streaming,
      })),
    [appChatStream.streamMessages],
  )

  const effectiveTaskStatus = appChatStream.status
  const effectiveTaskStep = appChatStream.currentStep
  const isTaskRunning = appChatStream.isStreaming || hasRunningAppStatus(appDetail)
  const canCode = Boolean(
    appDetail?.id &&
    !isTaskRunning &&
    (appDetail.status === 'READY' ||
      appDetail.status === 'FAILED' ||
      appDetail.status === 'CREATING'),
  )
  const canChat = Boolean(appDetail?.id && !isTaskRunning && appDetail.status === 'READY')
  const canVisualEdit = Boolean(canCode && appDetail?.previewUrl)
  const isDeploying = deployMutation.isPending || appDetail?.deployStatus === 'DEPLOYING'
  const canDeploy = Boolean(
    appDetail?.id && appDetail.status === 'READY' && !isTaskRunning && !isDeploying,
  )
  const deployBlockedReason = (() => {
    if (isDeploying) {
      return '项目正在部署，请稍候'
    }

    if (!appDetail?.id) {
      return '应用加载完成后才能部署'
    }

    if (isTaskRunning) {
      return '当前任务完成后才能部署'
    }

    if (appDetail.status !== 'READY') {
      return '应用生成成功后才能部署'
    }

    return undefined
  })()
  const effectiveDeployStatus = deployMutation.isPending ? 'DEPLOYING' : appDetail?.deployStatus
  const hasDeployUrl = Boolean(appDetail?.deployUrl)
  const canSubmitCase = Boolean(
    appDetail?.id &&
    appDetail.status === 'READY' &&
    effectiveDeployStatus === 'DEPLOYED' &&
    appDetail.deployUrl,
  )

  const handleLoadMoreMessages = useCallback(async () => {
    if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) {
      return
    }

    await messagesQuery.fetchNextPage()
  }, [messagesQuery.fetchNextPage, messagesQuery.hasNextPage, messagesQuery.isFetchingNextPage])

  const handleVisualEditModeChange = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        setIsVisualEditMode(false)
        setSelectedVisualEditElement(null)
        return
      }

      if (!canVisualEdit) {
        message.warning(
          appDetail?.previewUrl ? '当前状态暂不能生成或修改' : '预览加载后才能使用编辑',
        )
        return
      }

      setIsVisualEditMode(true)
      setSelectedVisualEditElement(null)
    },
    [appDetail?.previewUrl, canVisualEdit, message],
  )

  const handleVisualEditElementSelect = useCallback((element: VisualEditElement) => {
    setSelectedVisualEditElement(element)
  }, [])

  const handleSubmitMessage = useCallback(
    (prompt: string, mode: ChatRequestMode) => {
      const effectiveMode = isVisualEditMode ? ChatRequestMode.CODE : mode
      let requestPrompt = prompt

      if (isVisualEditMode) {
        if (!selectedVisualEditElement) {
          message.warning('请先在预览中选择要编辑的元素')
          return false
        }

        // 发送给 Agent 的内容包含源码定位，聊天区展示时会解析成用户友好的摘要。
        requestPrompt = buildVisualEditPrompt(prompt, selectedVisualEditElement)
      }

      if (requestPrompt.length > 4000) {
        message.warning(
          isVisualEditMode
            ? '需求和选中元素信息不能超过 4000 个字符'
            : '需求描述不能超过 4000 个字符',
        )
        return false
      }

      if (effectiveMode === ChatRequestMode.CHAT && !canChat) {
        message.warning('应用生成成功后才能进行答疑')
        return false
      }

      if (effectiveMode === ChatRequestMode.CODE && !canCode) {
        message.warning(isTaskRunning ? '当前任务完成后才能继续输入' : '当前状态暂不能生成或修改')
        return false
      }

      const started = appChatStream.startStream({
        mode: effectiveMode,
        prompt: requestPrompt,
      })

      if (!started) {
        message.warning('当前任务完成后才能继续输入')
      }

      if (started && isVisualEditMode) {
        setIsVisualEditMode(false)
        setSelectedVisualEditElement(null)
      }

      return started
    },
    [
      appChatStream,
      canChat,
      canCode,
      isTaskRunning,
      isVisualEditMode,
      message,
      selectedVisualEditElement,
    ],
  )

  const handleDeploy = useCallback(async () => {
    if (!canDeploy) {
      message.warning(deployBlockedReason ?? '当前状态不能部署')
      return
    }

    try {
      const response = await deployMutation.mutateAsync({ appId })
      const result = response.data

      queryClient.setQueryData<GetAppQueryResult>(getGetAppQueryKey(appId), (oldData) =>
        updateAppDetailDeployResult(oldData, {
          deployStatus: result?.deployStatus,
          deployUrl: result?.deployUrl,
          deployedAt: result?.deployedAt,
        }),
      )
      void queryClient.invalidateQueries({ queryKey: getGetAppQueryKey(appId) })

      if (!result?.deployUrl) {
        message.warning('部署成功，但后端未返回正式地址')
        return
      }

      message.success('部署成功')
    } catch (error) {
      void queryClient.invalidateQueries({ queryKey: getGetAppQueryKey(appId) })
      message.error((error as { message?: string })?.message ?? '部署项目失败')
    }
  }, [appId, canDeploy, deployBlockedReason, deployMutation, message])

  const handleConfirmDeploy = useCallback(() => {
    if (!canDeploy) {
      message.warning(deployBlockedReason ?? '当前状态不能部署')
      return
    }

    const isRedeploy = Boolean(appDetail?.deployUrl)

    modal.confirm({
      title: isRedeploy ? '重新部署项目？' : '部署项目？',
      content: isRedeploy
        ? '将使用当前预览版本更新正式访问地址，线上内容会被覆盖。'
        : '部署成功后会生成正式访问地址，方便对外分享和访问。',
      okText: isRedeploy ? '确认重新部署' : '确认部署',
      cancelText: '取消',
      centered: true,
      onOk: handleDeploy,
    })
  }, [appDetail?.deployUrl, canDeploy, deployBlockedReason, handleDeploy, message, modal])

  const handleCopyDeployUrl = useCallback(
    async (url: string | undefined) => {
      if (!url) {
        return
      }

      try {
        await navigator.clipboard.writeText(url)
        message.success('正式地址已复制')
      } catch {
        message.error('复制失败，请手动复制链接')
      }
    },
    [message],
  )

  const deployInfoPopoverContent = useMemo(() => {
    if (!hasDeployUrl) {
      return
    }

    return (
      <DeploymentInfoCard
        deployUrl={appDetail?.deployUrl}
        deployStatus={effectiveDeployStatus}
        deployedAt={appDetail?.deployedAt}
        blockedReason={deployBlockedReason}
        onCopy={(url) => void handleCopyDeployUrl(url)}
      />
    )
  }, [
    appDetail?.deployUrl,
    appDetail?.deployedAt,
    deployBlockedReason,
    effectiveDeployStatus,
    handleCopyDeployUrl,
    hasDeployUrl,
  ])

  useEffect(() => {
    if (!appDetail?.id || initialPromptStartedRef.current || appChatStream.isStreaming) {
      return
    }

    const initialPrompt = readInitialAppPrompt(appId)

    if (!initialPrompt) {
      return
    }

    const started = appChatStream.startStream({
      mode: ChatRequestMode.CODE,
      prompt: initialPrompt,
      onOpen: () => clearInitialAppPrompt(appId),
    })

    if (started) {
      initialPromptStartedRef.current = true
    }
  }, [appChatStream, appDetail?.id, appId])

  useEffect(() => {
    if (
      !appDetail?.id ||
      !appDetail.latestTaskId ||
      appChatStream.isStreaming ||
      !isActiveAppStatus(appDetail.status) ||
      readInitialAppPrompt(appId)
    ) {
      return
    }

    if (resumedTaskIdsRef.current.has(appDetail.latestTaskId)) {
      return
    }

    const started = appChatStream.startStream({
      mode: ChatRequestMode.RESUME,
    })

    if (started) {
      resumedTaskIdsRef.current.add(appDetail.latestTaskId)
    }
  }, [appChatStream, appDetail?.id, appDetail?.latestTaskId, appDetail?.status, appId])

  useEffect(() => {
    if (!isVisualEditMode || canVisualEdit) {
      return
    }

    setIsVisualEditMode(false)
    setSelectedVisualEditElement(null)
  }, [canVisualEdit, isVisualEditMode])

  return (
    <Layout className="fixed inset-0 z-0 flex overflow-hidden bg-slate-100 text-slate-950">
      <AppWorkbenchHeader
        appName={appDetail?.name}
        appStatus={appDetail?.status}
        deployStatus={effectiveDeployStatus}
        deployBlockedReason={deployBlockedReason}
        isTaskRunning={isTaskRunning}
        isDeployPending={deployMutation.isPending}
        canDeploy={canDeploy}
        hasDeployUrl={hasDeployUrl}
        canSubmitCase={canSubmitCase}
        deployInfoPopoverContent={deployInfoPopoverContent}
        onOpenSubmitCase={() => setIsSubmitCaseModalOpen(true)}
        onConfirmDeploy={handleConfirmDeploy}
      />

      <Layout.Content className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {appQuery.isLoading ? (
          <div className="p-6">
            <Skeleton
              active
              paragraph={{ rows: 8 }}
            />
          </div>
        ) : appQuery.isError ? (
          <div className="p-6">
            <Alert
              showIcon
              type="error"
              title="应用加载失败"
              description={(appQuery.error as { message?: string })?.message ?? '请稍后重试'}
            />
          </div>
        ) : (
          <>
            {appDetail?.deployErrorMessage && (
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
                  streamMessages={streamMessages}
                  runtimeDetails={appChatStream.runtimeDetails}
                  taskStatus={effectiveTaskStatus}
                  currentStep={effectiveTaskStep}
                  currentTaskId={
                    isTaskRunning
                      ? (appChatStream.currentRunId ?? appDetail?.latestTaskId)
                      : undefined
                  }
                  isStreaming={appChatStream.isStreaming}
                  isLoadingMessages={messagesQuery.isLoading}
                  hasMoreMessages={messagesQuery.hasNextPage}
                  isLoadingMoreMessages={messagesQuery.isFetchingNextPage}
                  canCode={canCode}
                  canChat={canChat}
                  isSubmitting={appChatStream.isStreaming}
                  previewUrl={appDetail?.previewUrl}
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
                  previewUrl={appDetail?.previewUrl}
                  previewReloadKey={previewReloadKey}
                  isGenerating={isTaskRunning}
                  errorMessage={appDetail?.errorMessage}
                  isVisualEditMode={isVisualEditMode}
                  onVisualEditModeChange={handleVisualEditModeChange}
                  onVisualEditElementSelect={handleVisualEditElementSelect}
                />
              </Splitter.Panel>
            </Splitter>
          </>
        )}
      </Layout.Content>

      <SubmitCaseModal
        open={isSubmitCaseModalOpen}
        appId={appDetail?.id}
        initialTitle={appDetail?.name}
        initialSummary={appDetail?.initPrompt}
        onCancel={() => setIsSubmitCaseModalOpen(false)}
        onSuccess={() => setIsSubmitCaseModalOpen(false)}
      />
    </Layout>
  )
}
