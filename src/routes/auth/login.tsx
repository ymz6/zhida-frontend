import { LoginPage } from '@/features/auth/pages/LoginPage'
import { createFileRoute } from '@tanstack/react-router'
// import { useAuthSessionStore } from '@/stores/auth-session'
// import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
  // 临时关闭登录态校验，便于不受会话状态影响访问登录页。
  // beforeLoad: () => {
  //   if (useAuthSessionStore.getState().accessToken) {
  //     throw redirect({
  //       to: '/',
  //       replace: true,
  //     })
  //   }
  // },
  component: LoginPage,
})
