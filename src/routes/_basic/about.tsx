import { AboutPage } from '@/features/about/pages/AboutPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_basic/about')({
  component: AboutPage,
})
