import { useGetAudit } from '@/api/generated/endpoints/admin-audit'
import type { AuditRecordVO } from '@/api/generated/models'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Alert, Button, Drawer, Result, Spin } from 'antd'
import { ArrowLeft, ExternalLink, MessageSquareText } from 'lucide-react'
import { useState } from 'react'

import { CaseAuditActionPanel } from '../components/CaseAuditActionPanel'
import { CaseAppMessagesPanel } from '../components/CaseAppMessagesPanel'
import { CasePreviewFrame } from '../components/CasePreviewFrame'
import { AuditRecordStatusTag } from '../components/CaseStatusTag'
import {
  formatCaseDateTime,
  getAuditRecordApp,
  getCaseAuthorName,
  getCaseErrorMessage,
  getCaseTitle,
  hasDeployUrl,
} from '../utils/caseManagement'

export function CaseAuditDetailPage() {
  const navigate = useNavigate()
  const { recordId } = useParams({ from: '/admin/case-audits_/$recordId' })
  const auditQuery = useGetAudit<AuditRecordVO | undefined, { message?: string }>(recordId, {
    query: {
      retry: false,
      select: (response) => response.data,
    },
  })
  const auditRecord = auditQuery.data
  const app = auditRecord ? getAuditRecordApp(auditRecord) : undefined
  const [isMessagesDrawerOpen, setIsMessagesDrawerOpen] = useState(false)

  if (auditQuery.isLoading) {
    return (
      <main className="flex min-h-105 items-center justify-center">
        <Spin />
      </main>
    )
  }

  if (auditQuery.isError || !auditRecord || !app) {
    return (
      <main className="flex min-h-130 items-center justify-center">
        <Result
          status={auditQuery.isError ? '500' : '404'}
          title={auditQuery.isError ? '审核详情加载失败' : '审核记录不存在'}
          subTitle={getCaseErrorMessage(auditQuery.error, '请稍后重试。')}
          extra={
            <Button onClick={() => void navigate({ to: '/admin/case-audits' })}>
              返回案例审核管理
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
          onClick={() => void navigate({ to: '/admin/case-audits' })}
          className="-ml-2 px-2 text-slate-500!"
        >
          返回案例审核管理
        </Button>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="m-0 max-w-full truncate text-xl font-semibold text-slate-950">
              {getCaseTitle(app)}
            </h1>
            <AuditRecordStatusTag status={auditRecord.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm leading-8 text-slate-500">
            <span>作者：{getCaseAuthorName(app)}</span>
            <span>创建于：{formatCaseDateTime(app.createdAt)}</span>
            <span>审核记录：{auditRecord.id ?? recordId}</span>
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

      {!hasDeployUrl(app) ? (
        <Alert
          showIcon
          type="warning"
          title="应用尚未部署，不能审核为公开案例"
          description="审核通过前必须能查看正式部署效果；当前可以拒绝该申请或等待用户完成部署后再处理。"
          className="rounded-xl"
        />
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <aside className="space-y-4 xl:order-2">
          <CaseAuditActionPanel
            auditRecord={auditRecord}
            app={app}
          />

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
