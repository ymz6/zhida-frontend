import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, PointerEvent, RefObject, SetStateAction } from 'react'

import { PREVIEW_DOCK_EDGE_OFFSET, type PreviewDockState } from '../utils/previewDock'

export function usePreviewDockDrag({
  dockRef,
  previewContainerRef,
  previewDockState,
  onPreviewDockStateChange,
}: {
  dockRef: RefObject<HTMLDivElement | null>
  previewContainerRef: RefObject<HTMLDivElement | null>
  previewDockState: PreviewDockState
  onPreviewDockStateChange: Dispatch<SetStateAction<PreviewDockState>>
}) {
  const dragStateRef = useRef<{
    hasMoved: boolean
    pointerId: number
    startClientY: number
    startOffsetY: number
  } | null>(null)
  const [isDraggingDock, setIsDraggingDock] = useState(false)

  const clampDockOffset = useCallback(
    (nextOffsetY: number) => {
      const previewContainer = previewContainerRef.current
      const dock = dockRef.current

      if (!previewContainer || !dock) {
        return Math.max(nextOffsetY, PREVIEW_DOCK_EDGE_OFFSET)
      }

      const maxOffsetY = Math.max(
        PREVIEW_DOCK_EDGE_OFFSET,
        previewContainer.clientHeight - dock.offsetHeight - PREVIEW_DOCK_EDGE_OFFSET,
      )

      return Math.min(Math.max(nextOffsetY, PREVIEW_DOCK_EDGE_OFFSET), maxOffsetY)
    },
    [dockRef, previewContainerRef],
  )

  const handleDockPointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return
      }

      const offsetY = clampDockOffset(previewDockState.offsetY)
      dragStateRef.current = {
        hasMoved: false,
        pointerId: event.pointerId,
        startClientY: event.clientY,
        startOffsetY: offsetY,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      setIsDraggingDock(true)
      onPreviewDockStateChange((state) =>
        state.offsetY === offsetY ? state : { ...state, offsetY },
      )
      event.preventDefault()
    },
    [clampDockOffset, onPreviewDockStateChange, previewDockState.offsetY],
  )

  const handleDockPointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const dragState = dragStateRef.current

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return
      }

      const pointerDeltaY = event.clientY - dragState.startClientY
      const offsetY = clampDockOffset(dragState.startOffsetY + pointerDeltaY)

      if (Math.abs(pointerDeltaY) > 4) {
        dragState.hasMoved = true
      }

      onPreviewDockStateChange((state) =>
        state.offsetY === offsetY ? state : { ...state, offsetY },
      )
      event.preventDefault()
    },
    [clampDockOffset, onPreviewDockStateChange],
  )

  const handleDockPointerEnd = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const dragState = dragStateRef.current

      if (!dragState || dragState.pointerId !== event.pointerId) {
        return
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      const shouldExpandCollapsedDock =
        event.type === 'pointerup' && !previewDockState.isExpanded && !dragState.hasMoved

      dragStateRef.current = null
      setIsDraggingDock(false)

      if (shouldExpandCollapsedDock) {
        onPreviewDockStateChange((state) => ({
          ...state,
          isExpanded: true,
        }))
      }
    },
    [onPreviewDockStateChange, previewDockState.isExpanded],
  )

  useEffect(() => {
    const previewContainer = previewContainerRef.current
    const dock = dockRef.current

    if (!previewContainer || !dock) {
      return
    }

    const clampCurrentOffset = () => {
      onPreviewDockStateChange((state) => {
        const offsetY = clampDockOffset(state.offsetY)

        return state.offsetY === offsetY ? state : { ...state, offsetY }
      })
    }

    clampCurrentOffset()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const resizeObserver = new ResizeObserver(clampCurrentOffset)
    resizeObserver.observe(previewContainer)
    resizeObserver.observe(dock)

    return () => resizeObserver.disconnect()
  }, [
    clampDockOffset,
    dockRef,
    onPreviewDockStateChange,
    previewContainerRef,
    previewDockState.isExpanded,
  ])

  return {
    isDraggingDock,
    handleDockPointerDown,
    handleDockPointerMove,
    handleDockPointerEnd,
  }
}
