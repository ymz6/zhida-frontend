import { useGetPublicCase } from '@/api/generated/endpoints/app-case'
import type { AppCaseDetail } from '@/api/generated/models'
import { useNavigate } from '@tanstack/react-router'
import { Alert, Avatar, Button, Card, Result, Skeleton, Tag } from 'antd'
import { ArrowLeft, ExternalLink, Sparkles } from 'lucide-react'

import {
  formatCaseDateTime,
  getCaseAuthorName,
  getCaseSummary,
  getCaseTitle,
  getErrorMessage,
  openCasePreview,
} from '../utils/case'

export function PublicCaseDetailPage({ caseId }: { caseId: string }) {
  const navigate = useNavigate()
  const caseQuery = useGetPublicCase<
    AppCaseDetail | undefined,
    { code?: number; message?: string }
  >(caseId, {
    query: {
      retry: false,
      select: (response) => response.data,
    },
  })
  const appCase = caseQuery.data

  if (caseQuery.isLoading) {
    return (
      <main className="space-y-5 xl:relative xl:left-1/2 xl:w-[calc(100vw-4rem)] xl:max-w-screen-2xl xl:-translate-x-1/2">
        <Skeleton.Button
          active
          className="h-10! w-28!"
        />
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card
            className="min-h-150 rounded-3xl border-slate-200/70 bg-white shadow-sm"
            classNames={{ body: 'p-5!' }}
          >
            <Skeleton
              active
              paragraph={{ rows: 12 }}
            />
          </Card>
          <Card
            className="rounded-3xl border-slate-200/70 bg-white shadow-sm"
            classNames={{ body: 'p-5!' }}
          >
            <Skeleton
              active
              avatar={{ size: 44 }}
              paragraph={{ rows: 7 }}
            />
          </Card>
        </section>
      </main>
    )
  }

  if (caseQuery.isError || !appCase) {
    const isNotFound = caseQuery.isError && caseQuery.error.code === 40400

    return (
      <main className="space-y-6">
        <Button
          icon={<ArrowLeft className="size-4" />}
          onClick={() => void navigate({ to: '/cases' })}
          className="h-10 rounded-full px-4!"
        >
          返回案例广场
        </Button>
        <Card className="rounded-3xl border-slate-200/70 bg-white shadow-sm">
          <Result
            status={isNotFound ? 'warning' : 'error'}
            title={isNotFound ? '案例不存在或已下架' : '案例加载失败'}
            subTitle={getErrorMessage(caseQuery.error, '请稍后重试')}
            extra={
              <Button
                type="primary"
                onClick={() => void navigate({ to: '/cases' })}
              >
                返回案例广场
              </Button>
            }
          />
        </Card>
      </main>
    )
  }

  const title = getCaseTitle(appCase.title)
  const summary = getCaseSummary(appCase.summary)
  const authorName = getCaseAuthorName(appCase.author)
  const authorInitial = authorName.trim().slice(0, 1) || '用'

  return (
    <main className="space-y-5 xl:relative xl:left-1/2 xl:w-[calc(100vw-4rem)] xl:max-w-screen-2xl xl:-translate-x-1/2">
      <Button
        icon={<ArrowLeft className="size-4" />}
        onClick={() => void navigate({ to: '/cases' })}
        className="h-10 rounded-full px-4!"
      >
        返回案例广场
      </Button>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card
          title={
            <div className="min-w-0 py-3">
              <p className="m-0 text-base font-semibold text-slate-950">应用预览</p>
              <p className="m-0 mt-1 truncate text-xs font-normal text-slate-400">
                {appCase.appName?.trim() || '未命名应用'}
              </p>
            </div>
          }
          extra={
            <Button
              type="primary"
              disabled={!appCase.previewUrl}
              icon={<ExternalLink className="size-4" />}
              onClick={() => openCasePreview(appCase.previewUrl)}
              className="hidden h-10 rounded-full px-4! sm:inline-flex"
            >
              新窗口预览
            </Button>
          }
          className="order-2 overflow-hidden rounded-3xl border-slate-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] xl:order-1"
          classNames={{
            body: 'p-0!',
            header: 'min-h-16! px-4! sm:px-5!',
          }}
        >
          {appCase.previewUrl ? (
            <iframe
              title={`${title}预览`}
              src={appCase.previewUrl}
              className="h-[72vh] min-h-150 w-full rounded-b-3xl border-0 bg-white xl:h-[calc(100vh-190px)] xl:min-h-160"
            />
          ) : (
            <div className="p-5">
              <Alert
                showIcon
                type="warning"
                title="该案例暂未提供预览地址"
              />
            </div>
          )}
        </Card>

        <aside className="order-1 xl:order-2 xl:sticky xl:top-24 xl:self-start">
          <Card
            className="rounded-3xl border-slate-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
            classNames={{ body: 'p-5!' }}
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {appCase.featured ? (
                    <Tag
                      color="gold"
                      className="m-0"
                      icon={<Sparkles className="size-3.5" />}
                    >
                      精选
                    </Tag>
                  ) : null}
                  <span className="text-sm text-slate-400">
                    {formatCaseDateTime(appCase.reviewedAt)}
                  </span>
                </div>

                <h1 className="m-0 text-2xl font-semibold leading-tight text-slate-950">{title}</h1>

                <p className="m-0 text-sm leading-6 text-slate-600">{summary}</p>
              </div>

              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4">
                <Avatar
                  src={appCase.author?.avatar}
                  size={42}
                  className="shrink-0 bg-sky-100! text-sky-600!"
                >
                  {authorInitial}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{authorName}</p>
                  <p className="truncate text-xs text-slate-400">
                    应用：{appCase.appName?.trim() || '未命名应用'}
                  </p>
                </div>
              </div>

              <dl className="space-y-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-slate-400">案例状态</dt>
                  <dd className="m-0 text-right font-medium text-slate-700">公开展示</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 text-slate-400">预览权限</dt>
                  <dd className="m-0 text-right font-medium text-slate-700">只读预览</dd>
                </div>
              </dl>

              <Button
                type="primary"
                block
                disabled={!appCase.previewUrl}
                icon={<ExternalLink className="size-4" />}
                onClick={() => openCasePreview(appCase.previewUrl)}
                className="h-11 rounded-xl sm:hidden"
              >
                新窗口预览
              </Button>
            </div>
          </Card>
        </aside>
      </section>
    </main>
  )
}
