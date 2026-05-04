import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_basic/cases')({
  component: Outlet,
})
