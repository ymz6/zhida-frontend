import { ChevronLeft, ChevronRight, ExternalLink, GripVertical, RotateCw } from 'lucide-react'
import type { PointerEvent, RefObject } from 'react'

const previewDockActionButtonClassName =
  'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50'

const previewDockIconButtonClassName =
  'flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

type PreviewActionDockProps = {
  dockRef: RefObject<HTMLDivElement | null>
  isDragging: boolean
  isExpanded: boolean
  offsetY: number
  previewUrl?: string
  canRefresh?: boolean
  onCollapse: () => void
  onExpand: () => void
  onOpenPreview: () => void
  onRefresh: () => void
  onDragPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  onDragPointerMove: (event: PointerEvent<HTMLButtonElement>) => void
  onDragPointerEnd: (event: PointerEvent<HTMLButtonElement>) => void
}

function PreviewDockDragHandle({
  isDragging,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerEnd,
}: Pick<
  PreviewActionDockProps,
  'isDragging' | 'onDragPointerDown' | 'onDragPointerMove' | 'onDragPointerEnd'
>) {
  return (
    <button
      type="button"
      className={`flex items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        isDragging ? 'cursor-grabbing bg-slate-100 text-slate-700' : 'cursor-grab'
      } h-8 w-7 touch-none`}
      title="上下拖动"
      aria-label="上下拖动预览操作条"
      onPointerDown={onDragPointerDown}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerEnd}
      onPointerCancel={onDragPointerEnd}
      onLostPointerCapture={onDragPointerEnd}
    >
      <GripVertical
        className="size-4"
        aria-hidden="true"
      />
    </button>
  )
}

export function PreviewActionDock({
  dockRef,
  isDragging,
  isExpanded,
  offsetY,
  previewUrl,
  canRefresh,
  onCollapse,
  onExpand,
  onOpenPreview,
  onRefresh,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerEnd,
}: PreviewActionDockProps) {
  return (
    <div
      ref={dockRef}
      className="absolute right-4 top-0 z-10 select-none"
      style={{ transform: `translateY(${offsetY}px)` }}
    >
      {isExpanded ? (
        <div className="flex items-center gap-1 rounded-lg bg-white/95 p-1 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/80 backdrop-blur">
          <PreviewDockDragHandle
            isDragging={isDragging}
            onDragPointerDown={onDragPointerDown}
            onDragPointerMove={onDragPointerMove}
            onDragPointerEnd={onDragPointerEnd}
          />
          <button
            type="button"
            disabled={!(canRefresh ?? previewUrl)}
            onClick={onRefresh}
            className={previewDockActionButtonClassName}
            title="刷新"
          >
            <RotateCw
              className="size-4"
              aria-hidden="true"
            />
            <span>刷新</span>
          </button>
          <button
            type="button"
            disabled={!previewUrl}
            onClick={onOpenPreview}
            className={previewDockActionButtonClassName}
            title="在新窗口打开"
          >
            <ExternalLink
              className="size-4"
              aria-hidden="true"
            />
            <span>新窗口打开</span>
          </button>
          <div className="mx-0.5 h-5 w-px bg-slate-200" />
          <button
            type="button"
            onClick={onCollapse}
            className={previewDockIconButtonClassName}
            title="收起操作条"
            aria-label="收起操作条"
          >
            <ChevronRight
              className="size-4"
              aria-hidden="true"
            />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`group flex h-12 w-8 touch-none flex-col items-center justify-center gap-0.5 rounded-full bg-white/85 text-slate-500 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200/80 backdrop-blur-md transition-all hover:bg-white hover:text-slate-900 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            isDragging ? 'cursor-grabbing bg-white text-slate-900 shadow-xl' : 'cursor-grab'
          }`}
          title="拖动或展开操作条"
          aria-label="拖动或展开预览操作条"
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerEnd}
          onPointerCancel={onDragPointerEnd}
          onLostPointerCapture={onDragPointerEnd}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onExpand()
            }
          }}
        >
          <GripVertical
            className="size-3.5 opacity-60 transition-opacity group-hover:opacity-80"
            aria-hidden="true"
          />
          <ChevronLeft
            className="size-3.5"
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  )
}
