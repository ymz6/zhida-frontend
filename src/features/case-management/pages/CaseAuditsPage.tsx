import { Card } from 'antd'

import { CaseAuditsTable } from '../components/CaseAuditsTable'

export function CaseAuditsPage() {
  return (
    <main className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-slate-950">案例审核管理</h1>
        </div>
      </header>

      <Card className="rounded-xl border-slate-200/70 bg-white shadow-sm">
        <CaseAuditsTable />
      </Card>
    </main>
  )
}
