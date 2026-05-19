import { AppCasesPage } from '@/features/case-management/pages/AppCasesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/app-cases')({
  component: AppCasesPage,
})
