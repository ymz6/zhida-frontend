import { PublicCaseDetailPage } from '@/features/cases-square/pages/PublicCaseDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_case-detail/cases/$appId')({
  component: PublicCaseDetailPage,
})
