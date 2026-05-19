import { AppCaseDetailPage } from '@/features/case-management/pages/AppCaseDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/app-cases_/$appId')({
  component: AppCaseDetailPage,
})
