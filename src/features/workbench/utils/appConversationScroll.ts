const APP_CONVERSATION_STICKY_BOTTOM_THRESHOLD = 48

type AppConversationScrollMetrics = Pick<HTMLElement, 'clientHeight' | 'scrollHeight' | 'scrollTop'>

export function isAppConversationNearBottom(metrics: AppConversationScrollMetrics) {
  return (
    metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight <=
    APP_CONVERSATION_STICKY_BOTTOM_THRESHOLD
  )
}
