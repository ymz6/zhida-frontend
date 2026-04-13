import { useAuthSessionStore } from '@/stores/auth-session'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
  beforeLoad: () => {
    if (useAuthSessionStore.getState().accessToken) {
      throw redirect({
        to: '/',
        replace: true,
      })
    }
  },
  component: LoginPage,
})
