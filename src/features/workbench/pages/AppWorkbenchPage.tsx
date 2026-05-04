import {
  getGetAppQueryKey,
  getListAppMessagesQueryKey,
  listAppMessages,
  type GetAppQueryResult,
  useCreateAppIteration,
  useDeployApp,
  useGetApp,
} from '@/api/generated/endpoints/app'
import { useGetTask } from '@/api/generated/endpoints/app-task'
import type { AppChatMessageInfo } from '@/api/generated/models'
import { SubmitCaseModal } from '@/features/app-case/components/SubmitCaseModal'
import { queryClient } from '@/libs/query-client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { App, Alert, Layout, Skeleton, Splitter } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AppWorkbenchHeader } from '../components/AppWorkbenchHeader'
import { AppWorkspacePanel } from '../components/AppWorkspacePanel'
import { ConversationPanel } from '../components/ConversationPanel'
import { DeploymentInfoCard } from '../components/DeploymentInfoCard'
import { useTaskStream } from '../hooks/useTaskStream'
import { isActiveAppStatus, isActiveTaskStatus, isTerminalTaskStatus } from '../types'
import { updateAppDetailDeployResult } from '../utils/deploy'

const CHAT_MESSAGES_LIMIT = 50

export function AppWorkbenchPage({ appId }: { appId: string }) {
  const { message, modal } = App.useApp()
  const [pendingTaskId, setPendingTaskId] = useState<string>()
  const [previewReloadKey, setPreviewReloadKey] = useState(0)
  const [isSubmitCaseModalOpen, setIsSubmitCaseModalOpen] = useState(false)
  const activePreviewTaskIdsRef = useRef(new Set<string>())
  const appQuery = useGetApp(appId)

  const messagesQueryKey = useMemo(
    () => [...getListAppMessagesQueryKey(appId), 'cursor', { limit: CHAT_MESSAGES_LIMIT }] as const,
    [appId],
  )
  const messagesQuery = useInfiniteQuery({
    queryKey: messagesQueryKey,
    initialPageParam: '',
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
  const createIterationMutation = useCreateAppIteration()
  const deployMutation = useDeployApp()
  const appDetail = appQuery.data?.data
  const currentTaskId = pendingTaskId ?? appDetail?.latestTaskId
  const hasLocalPendingTask = Boolean(pendingTaskId)
  const shouldTrackTask = Boolean(
    currentTaskId && (hasLocalPendingTask || isActiveAppStatus(appDetail?.status)),
  )
  const currentTaskQuery = useGetTask(currentTaskId ?? '', {
    query: {
      enabled: shouldTrackTask,
    },
  })
  const taskDetail = currentTaskQuery.data?.data
  const currentTask = currentTaskId && taskDetail?.id === currentTaskId ? taskDetail : undefined

  const handleStreamError = useCallback(
    (errorMessage: string) => {
      message.error(errorMessage)
    },
    [message],
  )

  const taskStream = useTaskStream({
    appId,
    taskId: currentTaskId,
    initialTaskStatus:
      currentTask?.status ??
      (hasLocalPendingTask || isActiveAppStatus(appDetail?.status) ? 'PENDING' : undefined),
    enabled: Boolean(
      shouldTrackTask &&
      (hasLocalPendingTask || !currentTaskQuery.isLoading) &&
      !isTerminalTaskStatus(currentTask?.status),
    ),
    onError: handleStreamError,
  })

  const persistedMessages = useMemo(
    () => [...(messagesQuery.data?.pages ?? [])].reverse().flatMap((page) => page.data?.list ?? []),
    [messagesQuery.data?.pages],
  )

  const streamMessages = useMemo<AppChatMessageInfo[]>(
    () =>
      taskStream.streamMessages.map((streamMessage) => ({
        id: streamMessage.messageId ?? streamMessage.key,
        appId: streamMessage.appId,
        taskId: streamMessage.taskId,
        role: streamMessage.role,
        messageType: streamMessage.messageType,
        content: streamMessage.content,
        metadata: streamMessage.metadata,
        createdAt: streamMessage.createdAt,
      })),
    [taskStream.streamMessages],
  )

  const effectiveTaskStatus = taskStream.status ?? currentTask?.status
  const effectiveTaskStep = taskStream.currentStep ?? currentTask?.currentStep
  const isTaskRunning =
    isActiveTaskStatus(effectiveTaskStatus) || isActiveAppStatus(appDetail?.status)
  const canIterate = Boolean(
    appDetail?.id &&
    !isTaskRunning &&
    (appDetail.status === 'READY' || appDetail.status === 'FAILED'),
  )
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

  const handleSubmitIteration = async (prompt: string) => {
    if (!canIterate) {
      message.warning('当前任务完成后才能继续迭代')
      return
    }

    if (prompt.length > 4000) {
      message.warning('需求描述不能超过 4000 个字符')
      return
    }

    try {
      const response = await createIterationMutation.mutateAsync({
        appId,
        data: { prompt },
      })
      const nextTaskId = response.data?.taskId

      if (!nextTaskId) {
        message.error('后端未返回任务 ID')
        return
      }

      void queryClient.invalidateQueries({ queryKey: getListAppMessagesQueryKey(appId) })
      setPendingTaskId(nextTaskId)
    } catch (error) {
      message.error((error as { message?: string })?.message ?? '创建迭代任务失败')
    }
  }

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
    if (!currentTaskId) {
      return
    }

    if (isActiveTaskStatus(effectiveTaskStatus) || taskStream.isStreaming) {
      activePreviewTaskIdsRef.current.add(currentTaskId)
      return
    }

    if (!isTerminalTaskStatus(effectiveTaskStatus)) {
      return
    }

    const wasActive = activePreviewTaskIdsRef.current.delete(currentTaskId)

    if (wasActive && effectiveTaskStatus === 'SUCCESS') {
      setPreviewReloadKey((key) => key + 1)
    }
  }, [currentTaskId, effectiveTaskStatus, taskStream.isStreaming])

  useEffect(() => {
    if (
      pendingTaskId &&
      currentTaskId === pendingTaskId &&
      isTerminalTaskStatus(effectiveTaskStatus)
    ) {
      setPendingTaskId(undefined)
    }
  }, [currentTaskId, effectiveTaskStatus, pendingTaskId])

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
                defaultSize="380px"
                min="320px"
                max="48%"
              >
                <ConversationPanel
                  key={appId}
                  persistedMessages={persistedMessages}
                  streamMessages={streamMessages}
                  runtimeDetails={taskStream.runtimeDetails}
                  taskStatus={effectiveTaskStatus}
                  currentStep={effectiveTaskStep}
                  currentTaskId={isTaskRunning ? currentTaskId : undefined}
                  isStreaming={taskStream.isStreaming}
                  isLoadingMessages={messagesQuery.isLoading}
                  hasMoreMessages={messagesQuery.hasNextPage}
                  isLoadingMoreMessages={messagesQuery.isFetchingNextPage}
                  canIterate={canIterate}
                  isSubmitting={createIterationMutation.isPending}
                  onLoadMoreMessages={handleLoadMoreMessages}
                  onSubmitIteration={handleSubmitIteration}
                />
              </Splitter.Panel>
              <Splitter.Panel min="420px">
                <AppWorkspacePanel
                  key={appId}
                  previewUrl={appDetail?.previewUrl}
                  previewReloadKey={previewReloadKey}
                  isGenerating={isTaskRunning}
                  errorMessage={appDetail?.errorMessage}
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
