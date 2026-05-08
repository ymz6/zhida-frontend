export const APP_STATUS_LABELS = {
  CREATING: '创建中',
  GENERATING: '生成中',
  BUILDING: '构建中',
  READY: '可使用',
  ITERATING: '迭代中',
  FAILED: '失败',
} as const

export const APP_DEPLOY_STATUS_LABELS = {
  UNDEPLOYED: '未部署',
  DEPLOYING: '部署中',
  DEPLOYED: '已部署',
  FAILED: '部署失败',
} as const

export const APP_TASK_STATUS_LABELS = {
  PENDING: '待执行',
  RUNNING: '执行中',
  SUCCESS: '执行成功',
  FAILED: '执行失败',
} as const

export const APP_TASK_STEP_LABELS = {
  INITIALIZING_WORKSPACE: '初始化工作区',
  GENERATING_CODE: '生成代码',
  CHATTING: '对话答疑',
  BUILDING: '构建应用',
  DEPLOYING: '部署应用',
  FINISHED: '已完成',
} as const

export const APP_CHAT_MESSAGE_TYPE_LABELS = {
  CHAT: '对话',
  BUILD_LOG: '构建日志',
  ERROR: '错误',
} as const

export type AppStatus = keyof typeof APP_STATUS_LABELS
export type AppDeployStatus = keyof typeof APP_DEPLOY_STATUS_LABELS
export type AppTaskStatus = keyof typeof APP_TASK_STATUS_LABELS
export type AppTaskStep = keyof typeof APP_TASK_STEP_LABELS
export type AppChatMessageRole = 'USER' | 'ASSISTANT' | 'TOOL' | 'SYSTEM'
export type AppChatMessageType = keyof typeof APP_CHAT_MESSAGE_TYPE_LABELS
export type TaskStreamEventName =
  | 'connected'
  | 'message'
  | 'state'
  | 'assistant.delta'
  | 'assistant.completed'
  | 'command-log'
  | `agent.${string}`

export interface TaskStreamEvent {
  eventType: string
  appId?: string
  taskId?: string
  taskEventId?: string
  status?: AppTaskStatus
  currentStep?: AppTaskStep
  messageId?: string
  role?: AppChatMessageRole
  messageType?: AppChatMessageType
  content?: string
  metadata?: string
  createdAt?: string
}

export interface RuntimeDetailEvent extends TaskStreamEvent {
  id: string
  receivedAt: number
}

export function isAppStatus(value: string | undefined): value is AppStatus {
  return Boolean(value && value in APP_STATUS_LABELS)
}

export function isAppDeployStatus(value: string | undefined): value is AppDeployStatus {
  return Boolean(value && value in APP_DEPLOY_STATUS_LABELS)
}

export function isAppTaskStatus(value: string | undefined): value is AppTaskStatus {
  return Boolean(value && value in APP_TASK_STATUS_LABELS)
}

export function isAppTaskStep(value: string | undefined): value is AppTaskStep {
  return Boolean(value && value in APP_TASK_STEP_LABELS)
}

export function isActiveAppStatus(status: string | undefined) {
  return (
    status === 'CREATING' ||
    status === 'GENERATING' ||
    status === 'BUILDING' ||
    status === 'ITERATING'
  )
}

export function isActiveTaskStatus(status: string | undefined) {
  return status === 'PENDING' || status === 'RUNNING'
}

export function isTerminalTaskStatus(status: string | undefined) {
  return status === 'SUCCESS' || status === 'FAILED'
}

export function parseMessageMetadata(metadata: string | undefined): Record<string, unknown> | null {
  if (!metadata) {
    return null
  }

  try {
    const parsed = JSON.parse(metadata)

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
