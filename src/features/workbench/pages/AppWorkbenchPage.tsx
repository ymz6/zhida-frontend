import { useGetApp } from '@/api/generated/endpoints/app'
import type { AppVO } from '@/api/generated/models'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Button, Layout, Result, Spin, Splitter } from 'antd'

import { AppWorkbenchHeader } from '../components/AppWorkbenchHeader'
import { AppWorkspacePanel } from '../components/AppWorkspacePanel'
import { ConversationPanel } from '../components/ConversationPanel'
import type { AppChatMessageInfo, WorkbenchChatMessageInfo } from '../utils/conversationTimeline'

const APP_FORBIDDEN_CODE = 40300
const APP_NOT_FOUND_CODE = 40400
const emptyPersistedMessages: AppChatMessageInfo[] = []
const emptyStreamMessages: WorkbenchChatMessageInfo[] = []

export function AppWorkbenchPage() {
  const navigate = useNavigate()
  const { appId } = useParams({ from: '/workbench_/$appId' })
  const appQuery = useGetApp<AppVO | undefined, { code?: number; message?: string }>(appId, {
    query: {
      retry: false,
      select: (response) => response.data,
    },
  })
  // 业务错误码会被 Axios 拦截器 reject 到 query.error。
  const appErrorCode = appQuery.error?.code
  const appErrorMessage = appQuery.error?.message
  const appDetail = appQuery.data

  const isTaskRunning = false
  const canSubmitMessage = false

  const renderResultPage = (status: '403' | '404' | '500', title: string, subTitle: string) => (
    <main className="fixed inset-0 z-0 flex items-center justify-center bg-slate-50 px-4">
      <Result
        status={status}
        title={title}
        subTitle={subTitle}
        extra={
          <Button
            type="primary"
            onClick={() => void navigate({ to: '/' })}
          >
            返回首页
          </Button>
        }
      />
    </main>
  )

  const handleSubmitMessage = () => {
    // 静态展示模式下不创建本地临时消息，等待后续后端接口接回。
    return false
  }

  if (appErrorCode === APP_FORBIDDEN_CODE) {
    return renderResultPage(
      '403',
      '无权访问应用',
      appErrorMessage || '你没有权限查看或编辑这个应用。',
    )
  }

  if (appErrorCode === APP_NOT_FOUND_CODE) {
    return renderResultPage(
      '404',
      '应用不存在',
      appErrorMessage || '该应用可能已被删除，或链接地址不正确。',
    )
  }

  if (appQuery.isError) {
    return renderResultPage('500', '应用加载失败', appErrorMessage || '请稍后重试。')
  }

  if (appQuery.isLoading) {
    return (
      <main className="fixed inset-0 z-0 flex items-center justify-center bg-slate-100 px-4">
        <div className="flex h-44 w-full max-w-sm flex-col items-center justify-center rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <Spin />
          <p className="mt-4 text-sm font-medium text-slate-700">正在加载应用...</p>
        </div>
      </main>
    )
  }

  if (!appDetail) {
    return renderResultPage('404', '应用不存在', '没有找到对应的应用详情。')
  }

  return (
    <Layout className="fixed inset-0 z-0 flex overflow-hidden bg-slate-100 text-slate-950">
      <Layout.Header className="flex h-14! shrink-0 items-center justify-between gap-4 overflow-hidden border-b border-slate-200 bg-white px-4! leading-normal! sm:px-5!">
        <AppWorkbenchHeader app={appDetail} />
      </Layout.Header>
      <Layout.Content className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <Splitter className="h-full min-h-0 flex-1 overflow-hidden bg-white">
          <Splitter.Panel
            defaultSize={380}
            min={320}
            max="48%"
          >
            <ConversationPanel
              key={appId}
              persistedMessages={emptyPersistedMessages}
              streamMessages={emptyStreamMessages}
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
              isVisualEditMode={false}
            />
          </Splitter.Panel>
        </Splitter>
      </Layout.Content>
    </Layout>
  )
}
