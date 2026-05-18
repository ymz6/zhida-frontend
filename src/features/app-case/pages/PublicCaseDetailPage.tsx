import { useNavigate } from '@tanstack/react-router'
import { Button, Card, Result } from 'antd'
import { ArrowLeft } from 'lucide-react'

/**
 * @deprecated 旧公开案例详情页已废弃；当前公开案例入口已切换到 cases-square。
 */
export function PublicCaseDetailPage({ caseId: _caseId }: { caseId: string }) {
  const navigate = useNavigate()

  return (
    <main className="space-y-6">
      <Button
        icon={<ArrowLeft className="size-4" />}
        onClick={() => void navigate({ to: '/cases' })}
        className="h-10 rounded-full px-4!"
      >
        返回案例广场
      </Button>
      <Card className="rounded-2xl border-slate-200/70 bg-white shadow-sm">
        <Result
          status="info"
          title="旧案例详情已下线"
          subTitle="旧详情接口已暂时移除，后续会随新案例流程重新接入。"
        />
      </Card>
    </main>
  )
}
