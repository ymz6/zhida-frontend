import { Card, Result } from 'antd'

/**
 * @deprecated 旧后台案例管理页已暂停接入，等待新接口重写。
 */
export function AdminCasesPage() {
  return (
    <Card className="rounded-2xl border-slate-200/70 bg-white shadow-sm">
      <Result
        status="info"
        title="案例管理暂未接入"
        subTitle="旧案例审核接口已暂时移除，当前仅保留后台菜单和路由占位。"
      />
    </Card>
  )
}
