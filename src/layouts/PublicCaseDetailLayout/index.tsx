import type { ReactNode } from 'react'

export default function PublicCaseDetailLayout({ children }: { children: ReactNode }) {
  return <div className="h-screen overflow-hidden bg-slate-100">{children}</div>
}
