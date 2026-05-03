import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { usePreviewDockDrag } from '../hooks/usePreviewDockDrag'
import { DEFAULT_PREVIEW_DOCK_STATE, type PreviewDockState } from '../utils/previewDock'
import { PreviewActionDock } from './PreviewActionDock'
import { PreviewEmptyState } from './PreviewEmptyState'

export { DEFAULT_PREVIEW_DOCK_STATE, type PreviewDockState }

export function PreviewContent({
  previewUrl,
  previewReloadKey,
  isGenerating,
  errorMessage,
  previewDockState,
  onPreviewDockStateChange,
}: {
  previewUrl?: string
  previewReloadKey?: number
  isGenerating?: boolean
  errorMessage?: string
  previewDockState: PreviewDockState
  onPreviewDockStateChange: Dispatch<SetStateAction<PreviewDockState>>
}) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const previousPreviewReloadKeyRef = useRef(previewReloadKey)
  const [previewVersion, setPreviewVersion] = useState(previewReloadKey ?? 0)
  const iframeSrc = previewUrl
    ? `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_v=${previewVersion}`
    : 'about:blank'
  const { isDraggingDock, handleDockPointerDown, handleDockPointerMove, handleDockPointerEnd } =
    usePreviewDockDrag({
      dockRef,
      previewContainerRef,
      previewDockState,
      onPreviewDockStateChange,
    })

  useEffect(() => {
    if (previousPreviewReloadKeyRef.current === previewReloadKey) {
      return
    }

    previousPreviewReloadKeyRef.current = previewReloadKey

    if (previewUrl) {
      setPreviewVersion((version) => version + 1)
    }
  }, [previewReloadKey, previewUrl])

  const handleOpenPreview = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noreferrer')
    }
  }

  const handleDockCollapse = () => {
    onPreviewDockStateChange((state) => ({
      ...state,
      isExpanded: false,
    }))
  }

  const handleDockExpand = () => {
    onPreviewDockStateChange((state) => ({
      ...state,
      isExpanded: true,
    }))
  }

  return (
    <div
      ref={previewContainerRef}
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white"
    >
      <PreviewActionDock
        dockRef={dockRef}
        isDragging={isDraggingDock}
        isExpanded={previewDockState.isExpanded}
        offsetY={previewDockState.offsetY}
        previewUrl={previewUrl}
        onCollapse={handleDockCollapse}
        onExpand={handleDockExpand}
        onOpenPreview={handleOpenPreview}
        onRefresh={() => setPreviewVersion((version) => version + 1)}
        onDragPointerDown={handleDockPointerDown}
        onDragPointerMove={handleDockPointerMove}
        onDragPointerEnd={handleDockPointerEnd}
      />

      <div className="relative min-h-0 flex-1">
        <iframe
          title="当前应用预览"
          src={iframeSrc}
          className="h-full w-full border-0 bg-transparent"
        />
        {isDraggingDock && (
          <div
            className="absolute inset-0 z-9 cursor-grabbing"
            aria-hidden="true"
          />
        )}
        {!previewUrl && (
          <PreviewEmptyState
            errorMessage={errorMessage}
            isGenerating={isGenerating}
          />
        )}
      </div>
    </div>
  )
}
