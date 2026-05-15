import AdminLayout from '@/layouts/AdminLayout'
import { createFileRoute, Outlet } from '@tanstack/react-router'
// import { useAuthSessionStore } from '@/stores/auth-session'
// import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  // 临时关闭登录校验和管理员校验，便于直接访问后台路由。
  // beforeLoad: () => {
  //   const { accessToken, userInfo } = useAuthSessionStore.getState()
  //
  //   if (!accessToken) {
  //     throw redirect({
  //       to: '/auth/login',
  //       replace: true,
  //     })
  //   }
  //
  //   if (userInfo?.role !== 1) {
  //     throw redirect({
  //       to: '/',
  //       replace: true,
  //     })
  //   }
  // },
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
})
