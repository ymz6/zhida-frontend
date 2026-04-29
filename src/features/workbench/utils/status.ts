import {
  APP_CHAT_MESSAGE_TYPE_LABELS,
  APP_DEPLOY_STATUS_LABELS,
  APP_STATUS_LABELS,
  APP_TASK_STATUS_LABELS,
  APP_TASK_STEP_LABELS,
} from '../types'

export function getAppStatusLabel(status: string | undefined) {
  return status && status in APP_STATUS_LABELS
    ? APP_STATUS_LABELS[status as keyof typeof APP_STATUS_LABELS]
    : '未知状态'
}

export function getDeployStatusLabel(status: string | undefined) {
  return status && status in APP_DEPLOY_STATUS_LABELS
    ? APP_DEPLOY_STATUS_LABELS[status as keyof typeof APP_DEPLOY_STATUS_LABELS]
    : '未知部署状态'
}

export function getDeployStatusColor(status: string | undefined) {
  if (status === 'DEPLOYING') {
    return 'processing'
  }

  if (status === 'DEPLOYED') {
    return 'success'
  }

  if (status === 'FAILED') {
    return 'error'
  }

  return 'default'
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
