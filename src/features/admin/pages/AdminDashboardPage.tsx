import { Card, Result } from 'antd'

export function AdminDashboardPage() {
  return (
    <Card className="rounded-2xl border-slate-200/70 bg-white shadow-sm">
      <Result
        status="info"
        title="运行监控暂未接入"
        subTitle="旧监控接口已暂时下线，后续重写后台接口后再恢复这里的数据展示。"
      />
    </Card>
  )
}
