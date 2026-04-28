import { AppWorkbenchPage } from '@/features/workbench/pages/AppWorkbenchPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/workbench')({
  component: AppWorkbenchPage,
})
