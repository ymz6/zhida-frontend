import { ProfilePage } from '@/features/user/pages/ProfilePage'
import { createFileRoute } from '@tanstack/react-router'
// import { useAuthSessionStore } from '@/stores/auth-session'
// import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_basic/profile')({
  // 临时关闭登录校验，便于直接访问个人资料页。
  // beforeLoad: () => {
  //   if (!useAuthSessionStore.getState().accessToken) {
  //     throw redirect({
  //       to: '/auth/login',
  //       replace: true,
  //     })
  //   }
  // },
  component: ProfilePage,
})
