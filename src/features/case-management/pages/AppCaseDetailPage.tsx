import { useGetAdminAppCase } from '@/api/generated/endpoints/admin-app-case'
import type { AppVO } from '@/api/generated/models'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Alert, Button, Drawer, Result, Spin } from 'antd'
import { ArrowLeft, ExternalLink, MessageSquareText } from 'lucide-react'
import { useState } from 'react'

import { AppCaseActionPanel } from '../components/AppCaseActionPanel'
import { CaseAppMessagesPanel } from '../components/CaseAppMessagesPanel'
import { CasePreviewFrame } from '../components/CasePreviewFrame'
import { AppCaseStatusTag } from '../components/CaseStatusTag'
import {
  formatCaseDateTime,
  getCaseAuthorName,
  getCaseErrorMessage,
  getCaseTitle,
  hasDeployUrl,
  hasPublicDeployAnomaly,
} from '../utils/caseManagement'

export function AppCaseDetailPage() {
  const navigate = useNavigate()
  const { appId } = useParams({ from: '/admin/app-cases_/$appId' })
  const appQuery = useGetAdminAppCase<AppVO | undefined, { message?: string }>(appId, {
    query: {
      retry: false,
      select: (response) => response.data,
    },
  })
  const app = appQuery.data
  const [isMessagesDrawerOpen, setIsMessagesDrawerOpen] = useState(false)

  if (appQuery.isLoading) {
    return (
      <main className="flex min-h-105 items-center justify-center">
        <Spin />
      </main>
    )
  }

  if (appQuery.isError || !app) {
    return (
      <main className="flex min-h-130 items-center justify-center">
        <Result
          status={appQuery.isError ? '500' : '404'}
          title={appQuery.isError ? '应用案例详情加载失败' : '应用案例不存在'}
          subTitle={getCaseErrorMessage(appQuery.error, '请稍后重试。')}
          extra={
            <Button onClick={() => void navigate({ to: '/admin/app-cases' })}>
              返回应用案例管理
            </Button>
          }
        />
      </main>
    )
  }

  return (
    <main className="space-y-4">
      <header className="space-y-2 border-b border-stone-200/80 pb-4">
        <Button
          type="text"
          icon={<ArrowLeft className="size-4" />}
          onClick={() => void navigate({ to: '/admin/app-cases' })}
          className="-ml-2 px-2 text-slate-500!"
        >
          返回应用案例管理
        </Button>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="m-0 max-w-full truncate text-xl font-semibold text-slate-950">
              {getCaseTitle(app)}
            </h1>
            <AppCaseStatusTag status={app.auditStatus} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm leading-8 text-slate-500">
            <span>作者：{getCaseAuthorName(app)}</span>
            <span>创建于：{formatCaseDateTime(app.createdAt)}</span>
            <span>应用 ID：{app.id ?? appId}</span>
            {hasDeployUrl(app) ? (
              <Button
                type="link"
                href={app.deployUrl}
                target="_blank"
                rel="noreferrer"
                icon={<ExternalLink className="size-4" />}
                className="h-auto p-0 text-sm"
              >
                打开部署地址
              </Button>
            ) : (
              <span className="text-amber-600">未部署</span>
            )}
          </div>
        </div>
      </header>

      {hasPublicDeployAnomaly(app) ? (
        <Alert
          showIcon
          type="warning"
          title="该应用已公开但缺少部署地址"
          description="请优先确认部署状态；继续公开管理前需要在二次确认中识别该风险。"
          className="rounded-xl"
        />
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <aside className="space-y-4 xl:order-2">
          <AppCaseActionPanel app={app} />

          <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="m-0 text-base font-semibold text-slate-950">生成消息</h2>
            </div>
            <Button
              icon={<MessageSquareText className="size-4" />}
              onClick={() => setIsMessagesDrawerOpen(true)}
              className="shrink-0"
            >
              查看生成消息
            </Button>
          </section>
        </aside>
        <div className="xl:order-1">
          <CasePreviewFrame
            deployUrl={app.deployUrl}
            className="xl:min-h-[calc(100vh-260px)]"
          />
        </div>
      </div>

      <Drawer
        title="对话消息"
        placement="right"
        open={isMessagesDrawerOpen}
        onClose={() => setIsMessagesDrawerOpen(false)}
        size="min(720px, calc(100vw - 24px))"
        classNames={{ body: 'p-3!' }}
        destroyOnHidden
      >
        {isMessagesDrawerOpen ? (
          <CaseAppMessagesPanel
            app={app}
            variant="drawer"
          />
        ) : null}
      </Drawer>
    </main>
  )
}
