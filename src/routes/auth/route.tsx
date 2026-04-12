import AuthLayout from '@/layouts/AuthLayout'
import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth')({
  component: () => (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  ),
})
