import { useCallback, useEffect, type RefObject } from 'react'

import { normalizeVisualEditElementPayload, type VisualEditElement } from '../utils/visualEdit'

type VisualEditModeMessageType = 'ZHIDA_ENABLE_EDIT_MODE' | 'ZHIDA_DISABLE_EDIT_MODE'

export function usePreviewVisualEditBridge({
  iframeRef,
  isVisualEditMode,
  onElementSelect,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>
  isVisualEditMode?: boolean
  onElementSelect: (element: VisualEditElement) => void
}) {
  const postVisualEditModeMessage = useCallback(
    (type: VisualEditModeMessageType) => {
      const iframeWindow = iframeRef.current?.contentWindow

      if (!iframeWindow) {
        return
      }

      // 预览地址可能经过代理或重定向，发送端使用 * 避免 targetOrigin 不匹配导致消息丢失。
      iframeWindow.postMessage({ type }, '*')
    },
    [iframeRef],
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
    if (!isVisualEditMode) {
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
        onElementSelect(element)
      }
    }

    window.addEventListener('message', handlePreviewMessage)

    return () => {
      window.removeEventListener('message', handlePreviewMessage)
    }
  }, [iframeRef, isVisualEditMode, onElementSelect])

  const handlePreviewLoad = useCallback(() => {
    if (isVisualEditMode) {
      // 预览刷新会重建子窗口，需要在 load 后补发当前编辑模式。
      postVisualEditModeMessage('ZHIDA_ENABLE_EDIT_MODE')
    }
  }, [isVisualEditMode, postVisualEditModeMessage])

  return {
    handlePreviewLoad,
  }
}
