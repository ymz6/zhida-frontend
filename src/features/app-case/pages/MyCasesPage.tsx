import { Card, Result } from 'antd'

/**
 * @deprecated 旧“我的投稿”页面已暂停接入，等待新案例流程重写。
 */
export function MyCasesPage() {
  return (
    <Card className="rounded-2xl border-slate-200/70 bg-white shadow-sm">
      <Result
        status="info"
        title="我的投稿暂未接入"
        subTitle="旧案例投稿接口已暂时移除，后续会接入新的案例流程。"
      />
    </Card>
  )
}
