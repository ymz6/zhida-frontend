import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/register')({
  component: RegisterPage,
})
