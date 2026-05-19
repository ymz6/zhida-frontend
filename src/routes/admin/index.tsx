import { AdminLlmLogsPage } from '@/features/admin/pages/AdminLlmLogsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
  component: AdminLlmLogsPage,
})
