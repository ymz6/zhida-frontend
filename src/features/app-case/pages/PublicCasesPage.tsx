import { Card, Result } from 'antd'

/**
 * @deprecated 旧公开案例列表页已废弃；/_basic/cases 已切换到新案例广场。
 */
export function PublicCasesPage() {
  return (
    <main className="space-y-6">
      <Card className="rounded-2xl border-slate-200/70 bg-white shadow-sm">
        <Result
          status="info"
          title="旧案例广场已下线"
          subTitle="当前公开案例入口已切换到新的案例广场页面。"
        />
      </Card>
    </main>
  )
}
