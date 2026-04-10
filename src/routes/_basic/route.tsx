import BasicLayout from '@/layouts/BasicLayout'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_basic')({
  component: () => (
    <BasicLayout>
      <Outlet />
    </BasicLayout>
  ),
})
