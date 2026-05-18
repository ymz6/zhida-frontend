import { Card, Result } from 'antd'

export function AdminUsersPage() {
  return (
    <Card className="rounded-2xl border-slate-200/70 bg-white shadow-sm">
      <Result
        status="info"
        title="用户管理暂未接入"
        subTitle="旧用户管理接口已暂时移除，当前仅保留后台路由占位。"
      />
    </Card>
  )
}
