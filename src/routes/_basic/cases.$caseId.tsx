import { PublicCaseDetailPage } from '@/features/app-case/pages/PublicCaseDetailPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_basic/cases/$caseId')({
  component: () => {
    const { caseId } = Route.useParams()

    return <PublicCaseDetailPage caseId={caseId} />
  },
})
