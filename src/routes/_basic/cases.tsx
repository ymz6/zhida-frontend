import { CasesSquarePage } from '@/features/cases-square/pages/CasesSquarePage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_basic/cases')({
  component: CasesSquarePage,
})
