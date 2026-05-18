const APP_STATUS_LABELS = {
  CREATING: '创建中',
  GENERATING: '生成中',
  BUILDING: '构建中',
  READY: '可使用',
  ITERATING: '迭代中',
  FAILED: '失败',
} as const

const APP_TASK_STATUS_LABELS = {
  PENDING: '待执行',
  RUNNING: '执行中',
  SUCCESS: '执行成功',
  FAILED: '执行失败',
} as const

const APP_TASK_STEP_LABELS = {
  INITIALIZING_WORKSPACE: '初始化工作区',
  GENERATING_CODE: '生成代码',
  CHATTING: '对话答疑',
  BUILDING: '构建应用',
  DEPLOYING: '部署应用',
  FINISHED: '已完成',
} as const

const APP_CHAT_MESSAGE_TYPE_LABELS = {
  CHAT: '对话',
  BUILD_LOG: '构建日志',
  ERROR: '错误',
} as const

export function getAppStatusLabel(status: string | undefined) {
  return status && status in APP_STATUS_LABELS
    ? APP_STATUS_LABELS[status as keyof typeof APP_STATUS_LABELS]
    : '未知状态'
}

export function getMessageTypeLabel(messageType: string | undefined) {
  return messageType && messageType in APP_CHAT_MESSAGE_TYPE_LABELS
    ? APP_CHAT_MESSAGE_TYPE_LABELS[messageType as keyof typeof APP_CHAT_MESSAGE_TYPE_LABELS]
    : '消息'
}

export function getTaskStatusLabel(status: string | undefined) {
  return status && status in APP_TASK_STATUS_LABELS
    ? APP_TASK_STATUS_LABELS[status as keyof typeof APP_TASK_STATUS_LABELS]
    : '等待任务'
}

export function getTaskStepLabel(step: string | undefined) {
  return step && step in APP_TASK_STEP_LABELS
    ? APP_TASK_STEP_LABELS[step as keyof typeof APP_TASK_STEP_LABELS]
    : undefined
}
