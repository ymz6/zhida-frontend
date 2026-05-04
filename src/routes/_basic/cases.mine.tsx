import { MyCasesPage } from '@/features/app-case/pages/MyCasesPage'
import { useAuthSessionStore } from '@/stores/auth-session'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_basic/cases/mine')({
  beforeLoad: () => {
    if (!useAuthSessionStore.getState().accessToken) {
      throw redirect({
        to: '/auth/login',
        replace: true,
      })
    }
  },
  component: MyCasesPage,
})
