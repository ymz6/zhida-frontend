import { PublicCasesPage } from '@/features/app-case/pages/PublicCasesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_basic/cases/')({
  component: PublicCasesPage,
})
