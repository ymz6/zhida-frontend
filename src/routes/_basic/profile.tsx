import { ProfilePage } from '@/features/user/pages/ProfilePage'
import { useAuthSessionStore } from '@/stores/auth-session'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_basic/profile')({
  beforeLoad: () => {
    if (!useAuthSessionStore.getState().accessToken) {
      throw redirect({
        to: '/auth/login',
        replace: true,
      })
    }
  },
  component: ProfilePage,
})
