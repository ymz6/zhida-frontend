import { useAuthSessionStore } from '@/stores/auth-session'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/register')({
  beforeLoad: () => {
    if (useAuthSessionStore.getState().accessToken) {
      throw redirect({
        to: '/',
        replace: true,
      })
    }
  },
  component: RegisterPage,
})
