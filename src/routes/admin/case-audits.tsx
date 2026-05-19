import { CaseAuditsPage } from '@/features/case-management/pages/CaseAuditsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/case-audits')({
  component: CaseAuditsPage,
})
