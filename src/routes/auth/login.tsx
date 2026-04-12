import { LoginPage } from '@/features/auth/pages/LoginPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})
