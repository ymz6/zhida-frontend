import { useCreatePreviewSession } from '@/api/generated/endpoints/app-preview'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

const API_PROXY_PREFIX = '/api'
const PREVIEW_SESSION_EXPIRY_BUFFER_MS = 5_000

interface PreviewSessionCache {
  previewUrl: string
  expiresAt: number
}

function getPreviewSessionCacheKey(appId: string) {
  return ['workbench', 'previewSession', appId] as const
}

function normalizePreviewUrl(previewUrl: string) {
  if (
    previewUrl.startsWith(`${API_PROXY_PREFIX}/`) ||
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(previewUrl)
  ) {
    return previewUrl
  }

  // 后端返回的是服务端路径，浏览器侧必须加 /api 才能命中 Vite/Nginx 代理。
  return previewUrl.startsWith('/')
    ? `${API_PROXY_PREFIX}${previewUrl}`
    : `${API_PROXY_PREFIX}/${previewUrl}`
}

function buildIframeSrc(previewUrl: string | undefined, reloadVersion: number) {
  if (!previewUrl) {
    return 'about:blank'
  }

  return `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_v=${reloadVersion}`
}

function getPreviewSessionExpiresAt(expiresIn: string | undefined) {
  const expiresInSeconds = Number(expiresIn)

  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return Date.now()
  }

  return Date.now() + expiresInSeconds * 1000
}

function isPreviewSessionFresh(session: PreviewSessionCache | undefined) {
  return Boolean(
    session?.previewUrl && session.expiresAt - PREVIEW_SESSION_EXPIRY_BUFFER_MS > Date.now(),
  )
}

export function usePreviewSession({ appId }: { appId?: string }) {
  const queryClient = useQueryClient()
  const latestSessionRequestRef = useRef(0)
  const [reloadVersion, setReloadVersion] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const { isPending, mutateAsync: createPreviewSession } = useCreatePreviewSession<{
    message?: string
  }>({
    mutation: {
      retry: false,
    },
  })

  const getFreshCachedPreviewUrl = useCallback(() => {
    if (!appId) {
      return undefined
    }

    const cachedSession = queryClient.getQueryData<PreviewSessionCache>(
      getPreviewSessionCacheKey(appId),
    )

    return isPreviewSessionFresh(cachedSession) ? cachedSession?.previewUrl : undefined
  }, [appId, queryClient])

  const loadPreviewSession = useCallback(async () => {
    if (!appId) {
      return undefined
    }

    const cachedPreviewUrl = getFreshCachedPreviewUrl()

    if (cachedPreviewUrl) {
      setPreviewUrl(cachedPreviewUrl)
      setErrorMessage(undefined)
      return cachedPreviewUrl
    }

    const requestId = latestSessionRequestRef.current + 1
    latestSessionRequestRef.current = requestId

    setPreviewUrl(undefined)
    setErrorMessage(undefined)

    try {
      const response = await createPreviewSession({ appId })
      const nextPreviewUrl = response.data?.previewUrl

      if (latestSessionRequestRef.current !== requestId) {
        return undefined
      }

      if (!nextPreviewUrl) {
        setErrorMessage('后端未返回预览地址。')
        return undefined
      }

      const normalizedPreviewUrl = normalizePreviewUrl(nextPreviewUrl)

      // 预览 session 是短租约；未过期时复用，避免切回预览页签反复创建。
      queryClient.setQueryData<PreviewSessionCache>(getPreviewSessionCacheKey(appId), {
        previewUrl: normalizedPreviewUrl,
        expiresAt: getPreviewSessionExpiresAt(response.data?.expiresIn),
      })
      setPreviewUrl(normalizedPreviewUrl)
      return normalizedPreviewUrl
    } catch (error) {
      if (latestSessionRequestRef.current !== requestId) {
        return undefined
      }

      // 会话接口失败时 iframe 无法带上预览 Cookie，先在外层给出明确反馈。
      setErrorMessage((error as { message?: string })?.message || '预览会话创建失败，请稍后重试。')
      return undefined
    }
  }, [appId, createPreviewSession, getFreshCachedPreviewUrl, queryClient])

  const refresh = useCallback(() => {
    const cachedPreviewUrl = getFreshCachedPreviewUrl()

    if (cachedPreviewUrl) {
      setPreviewUrl(cachedPreviewUrl)
      setErrorMessage(undefined)
      setReloadVersion((version) => version + 1)
      return
    }

    void loadPreviewSession().then((nextPreviewUrl) => {
      if (nextPreviewUrl) {
        setReloadVersion((version) => version + 1)
      }
    })
  }, [getFreshCachedPreviewUrl, loadPreviewSession])

  useEffect(() => {
    if (!appId) {
      setPreviewUrl(undefined)
      setErrorMessage(undefined)
      return
    }

    void loadPreviewSession()

    return () => {
      latestSessionRequestRef.current += 1
    }
  }, [appId, loadPreviewSession])

  return {
    previewUrl,
    iframeSrc: buildIframeSrc(previewUrl, reloadVersion),
    errorMessage,
    isLoading: Boolean(appId && isPending),
    refresh,
  }
}
