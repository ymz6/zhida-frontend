import emptyAppCover from '@/assets/empty-app-cover.svg'

/**
 * @deprecated 旧案例卡片封面组件，仅为旧案例模块渐进移除保留。
 */
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
      <img
        src={coverUrl || emptyAppCover}
        alt={`${title}封面`}
        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
      />
      {coverUrl ? (
        <div
          className="absolute inset-0 bg-linear-to-t from-slate-950/35 via-transparent to-white/10"
          aria-hidden="true"
        />
      ) : null}
    </div>
  )
}
