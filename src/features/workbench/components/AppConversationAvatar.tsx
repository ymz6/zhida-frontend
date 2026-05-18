import { Bot, UserRound } from 'lucide-react'

export function AppConversationAvatar({ role }: { role: 'assistant' | 'user' }) {
  if (role === 'assistant') {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <Bot
          className="size-4"
          aria-hidden="true"
        />
      </div>
    )
  }

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
      <UserRound
        className="size-4"
        aria-hidden="true"
      />
    </div>
  )
}
