import { AdminCasesPage } from '@/features/app-case/pages/AdminCasesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/cases')({
  component: AdminCasesPage,
})
