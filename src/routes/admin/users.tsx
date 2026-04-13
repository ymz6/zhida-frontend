import { AdminUsersPage } from '@/features/admin/pages/AdminUsersPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
})
