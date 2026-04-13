import AdminLayout from '@/layouts/AdminLayout'
import { useAuthSessionStore } from '@/stores/auth-session'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    const { accessToken, userInfo } = useAuthSessionStore.getState()

    if (!accessToken) {
      throw redirect({
        to: '/auth/login',
        replace: true,
      })
    }

    if (userInfo?.role !== 1) {
      throw redirect({
        to: '/',
        replace: true,
      })
    }
  },
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
})
