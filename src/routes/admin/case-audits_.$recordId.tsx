import { CaseAuditDetailPage } from '@/features/case-management/pages/CaseAuditDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/case-audits_/$recordId')({
  component: CaseAuditDetailPage,
})
