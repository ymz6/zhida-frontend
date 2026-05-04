import { ImageOff } from 'lucide-react'

export function CaseCover({
  coverUrl,
  title,
  className,
}: {
  coverUrl?: string
  title: string
  className?: string
}) {
  return (
    <div
      className={[
        'relative aspect-video overflow-hidden bg-linear-to-br from-sky-600 via-cyan-500 to-emerald-400',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={`${title}封面`}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <ImageOff
            className="size-8 text-white/75"
            aria-hidden="true"
          />
          <span className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
            Zhida Case
          </span>
          <span className="mt-2 line-clamp-2 text-2xl font-bold leading-tight text-white/95">
            {title}
          </span>
        </div>
      )}
      <div
        className="absolute inset-0 bg-linear-to-t from-slate-950/35 via-transparent to-white/10"
        aria-hidden="true"
      />
    </div>
  )
}
