import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { usePreviewDockDrag } from '../hooks/usePreviewDockDrag'
import { DEFAULT_PREVIEW_DOCK_STATE, type PreviewDockState } from '../utils/previewDock'
import { normalizeVisualEditElementPayload, type VisualEditElement } from '../utils/visualEdit'
import { PreviewActionDock } from './PreviewActionDock'
import { PreviewEmptyState } from './PreviewEmptyState'

export { DEFAULT_PREVIEW_DOCK_STATE, type PreviewDockState }

export function PreviewContent({
  previewUrl,
  previewReloadKey,
  isGenerating,
  errorMessage,
  isVisualEditMode,
  previewDockState,
  onVisualEditElementSelect,
  onPreviewDockStateChange,
}: {
  previewUrl?: string
  previewReloadKey?: number
  isGenerating?: boolean
  errorMessage?: string
  isVisualEditMode?: boolean
  previewDockState: PreviewDockState
  onVisualEditElementSelect?: (element: VisualEditElement) => void
  onPreviewDockStateChange: Dispatch<SetStateAction<PreviewDockState>>
}) {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
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

  const postVisualEditModeMessage = useCallback(
    (type: 'ZHIDA_ENABLE_EDIT_MODE' | 'ZHIDA_DISABLE_EDIT_MODE') => {
      const iframeWindow = iframeRef.current?.contentWindow

      if (!iframeWindow) {
        return
      }

      // 预览地址可能经过代理或重定向，发送端使用 * 避免 targetOrigin 不匹配导致消息丢失。
      iframeWindow.postMessage({ type }, '*')
    },
    [],
  )

  useEffect(() => {
    postVisualEditModeMessage(
      isVisualEditMode ? 'ZHIDA_ENABLE_EDIT_MODE' : 'ZHIDA_DISABLE_EDIT_MODE',
    )

    return () => {
      if (isVisualEditMode) {
        postVisualEditModeMessage('ZHIDA_DISABLE_EDIT_MODE')
      }
    }
  }, [isVisualEditMode, postVisualEditModeMessage])

  useEffect(() => {
    if (!isVisualEditMode || !onVisualEditElementSelect) {
      return
    }

    const handlePreviewMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow

      if (!iframeWindow || event.source !== iframeWindow) {
        return
      }

      const data = event.data as { type?: unknown; payload?: unknown } | undefined

      if (data?.type !== 'ZHIDA_ELEMENT_SELECTED') {
        return
      }

      const element = normalizeVisualEditElementPayload(data.payload)

      if (element) {
        onVisualEditElementSelect(element)
      }
    }

    window.addEventListener('message', handlePreviewMessage)

    return () => {
      window.removeEventListener('message', handlePreviewMessage)
    }
  }, [isVisualEditMode, onVisualEditElementSelect])

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

  const handlePreviewLoad = () => {
    if (isVisualEditMode) {
      // 预览刷新会重建子窗口，需要在 load 后补发当前编辑模式。
      postVisualEditModeMessage('ZHIDA_ENABLE_EDIT_MODE')
    }
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
          id="preview"
          ref={iframeRef}
          title="当前应用预览"
          src={iframeSrc}
          allow="fullscreen; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={handlePreviewLoad}
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
