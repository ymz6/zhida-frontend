import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboardPage,
})
