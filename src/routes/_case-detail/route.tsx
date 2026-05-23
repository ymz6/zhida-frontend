import PublicCaseDetailLayout from '@/layouts/PublicCaseDetailLayout'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_case-detail')({
  component: () => (
    <PublicCaseDetailLayout>
      <Outlet />
    </PublicCaseDetailLayout>
  ),
})
