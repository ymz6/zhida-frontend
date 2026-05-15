import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { createFileRoute } from '@tanstack/react-router'
// import { useAuthSessionStore } from '@/stores/auth-session'
// import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/register')({
  // 临时关闭登录态校验，便于不受会话状态影响访问注册页。
  // beforeLoad: () => {
  //   if (useAuthSessionStore.getState().accessToken) {
  //     throw redirect({
  //       to: '/',
  //       replace: true,
  //     })
  //   }
  // },
  component: RegisterPage,
})
