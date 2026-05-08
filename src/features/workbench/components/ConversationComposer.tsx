import { ChatRequestMode } from '@/api/generated/models'
import { Sender } from '@ant-design/x'
import { Button, Tooltip } from 'antd'
import { ArrowUp, Crosshair, MessagesSquare } from 'lucide-react'
import { useEffect, useState } from 'react'

import { parseVisualEditSource, type VisualEditElement } from '../utils/visualEdit'

const composerActionButtonClassName =
  'h-8! rounded-full! border-0! px-3! text-sm! font-medium! shadow-none! [&_.ant-btn-icon]:inline-flex! [&_.ant-btn-icon]:items-center!'
const composerInactiveActionButtonClassName = `${composerActionButtonClassName} bg-white! text-slate-700! hover:bg-white! hover:text-slate-900!`
const composerActiveActionButtonClassName = `${composerActionButtonClassName} bg-slate-900! text-white! hover:bg-slate-800! hover:text-white!`

export function ConversationComposer({
  canCode,
  canChat,
  isSubmitting,
  previewUrl,
  isVisualEditMode,
  selectedVisualEditElement,
  onVisualEditModeChange,
  onSubmitMessage,
}: {
  canCode?: boolean
  canChat?: boolean
  isSubmitting?: boolean
  previewUrl?: string
  isVisualEditMode?: boolean
  selectedVisualEditElement?: VisualEditElement | null
  onVisualEditModeChange?: (enabled: boolean) => void
  onSubmitMessage: (prompt: string, mode: ChatRequestMode) => boolean
}) {
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<ChatRequestMode>(ChatRequestMode.CODE)

  // 可视化编辑一定会修改代码，因此输入框始终按 CODE 模式提交。
  const effectiveMode = isVisualEditMode ? ChatRequestMode.CODE : mode
  const canSubmitCurrentMode =
    effectiveMode === ChatRequestMode.CHAT ? Boolean(canChat) : Boolean(canCode)
  const isComposerDisabled = Boolean(isSubmitting || !canSubmitCurrentMode)
  const isPromptEmpty = prompt.trim().length === 0
  const isVisualEditSubmitBlocked = Boolean(isVisualEditMode && !selectedVisualEditElement)
  const isSendDisabled = Boolean(isComposerDisabled || isPromptEmpty || isVisualEditSubmitBlocked)
  const isChatMode = effectiveMode === ChatRequestMode.CHAT
  const canEnableVisualEdit = Boolean(previewUrl && canCode && !isSubmitting)
  const selectedVisualEditSourceLocation = selectedVisualEditElement
    ? parseVisualEditSource(selectedVisualEditElement.source)
    : null
  const selectedVisualEditLineText = selectedVisualEditSourceLocation?.lineNumber
    ? `:${selectedVisualEditSourceLocation.lineNumber}`
    : ''
  const disabledReason = (() => {
    if (isSubmitting) {
      return '当前任务完成后可继续输入'
    }

    if (effectiveMode === ChatRequestMode.CHAT && !canChat) {
      return '应用生成成功后可进行答疑'
    }

    if (effectiveMode === ChatRequestMode.CODE && !canCode) {
      return '当前状态暂不能生成或修改'
    }

    return undefined
  })()
  const sendTooltipTitle =
    disabledReason ??
    (isVisualEditSubmitBlocked
      ? '请先在预览中选择要编辑的元素'
      : isPromptEmpty
        ? '请输入内容后发送'
        : undefined)
  const visualEditTooltipTitle = (() => {
    if (isVisualEditMode) {
      return '退出可视化编辑模式'
    }

    if (isSubmitting) {
      return '当前任务完成后可使用可视化编辑'
    }

    if (!previewUrl) {
      return '预览加载后可使用可视化编辑'
    }

    if (!canCode) {
      return '当前状态暂不能生成或修改'
    }

    return '开启可视化编辑模式'
  })()
  const chatModeTooltipTitle = (() => {
    if (isVisualEditMode) {
      return '可视化编辑中不能切换对话模式'
    }

    if (isSubmitting) {
      return '当前任务完成后可切换对话模式'
    }

    if (!canChat) {
      return '应用生成成功后可进行答疑'
    }

    return isChatMode ? '已开启对话模式，点击切回生成模式' : '切换为对话答疑模式'
  })()

  useEffect(() => {
    if (isVisualEditMode) {
      setMode(ChatRequestMode.CODE)
    }
  }, [isVisualEditMode])

  const handleToggleVisualEditMode = () => {
    if (!isVisualEditMode && !canEnableVisualEdit) {
      return
    }

    const nextEnabled = !isVisualEditMode

    if (nextEnabled) {
      setMode(ChatRequestMode.CODE)
    }

    onVisualEditModeChange?.(nextEnabled)
  }

  const handleToggleChatMode = () => {
    if (isSubmitting || isVisualEditMode) {
      return
    }

    if (isChatMode) {
      setMode(ChatRequestMode.CODE)
      return
    }

    if (canChat) {
      setMode(ChatRequestMode.CHAT)
    }
  }

  const handleSubmit = (value: string) => {
    const nextPrompt = value.trim()

    if (!nextPrompt) {
      return
    }

    if (onSubmitMessage(nextPrompt, effectiveMode)) {
      setPrompt('')
    }
  }

  return (
    <div className="relative shrink-0 bg-white px-4 pt-3 pb-4">
      <div className="pointer-events-none absolute inset-x-0 -top-5 h-5 bg-linear-to-b from-white/0 to-white" />
      {isVisualEditMode && (
        <div className="relative z-10 mb-2 flex min-h-11 min-w-0 items-center gap-2.5 rounded-2xl border border-slate-200/70 bg-slate-50/95 px-4 py-2 text-sm text-slate-600 shadow-sm shadow-slate-950/8">
          <Crosshair
            className="size-4 shrink-0 text-indigo-500/80"
            aria-hidden="true"
          />
          {selectedVisualEditElement && selectedVisualEditSourceLocation ? (
            <>
              <span className="shrink-0 text-slate-600">已选中元素</span>
              <span className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs leading-4 text-slate-700">
                {`<${selectedVisualEditElement.tag}>`}
              </span>
              <span className="ml-auto min-w-0 truncate font-mono text-sm text-slate-500">
                {selectedVisualEditSourceLocation.filePath}
                {selectedVisualEditLineText}
              </span>
            </>
          ) : (
            <span className="min-w-0 truncate text-slate-600">等待选择预览元素</span>
          )}
        </div>
      )}
      <Sender
        value={prompt}
        onChange={(v) => setPrompt(v)}
        onSubmit={handleSubmit}
        disabled={isComposerDisabled}
        loading={isSubmitting}
        autoSize={{ minRows: 1, maxRows: 6 }}
        placeholder={
          isVisualEditMode
            ? selectedVisualEditElement
              ? '描述这个元素要如何调整'
              : '先在右侧预览选择元素，再描述修改需求'
            : mode === ChatRequestMode.CHAT
              ? '询问当前应用的页面、功能或实现细节'
              : '描述想生成或调整的地方，可以一步一步完善生成效果'
        }
        className="relative z-10 rounded-3xl! border-0! bg-slate-100! px-3! pt-3! pb-2! shadow-none!"
        classNames={{
          content: 'items-start!',
          input:
            'min-h-10! bg-transparent! px-1! py-0! text-base! leading-7! text-slate-800! placeholder:text-slate-400!',
          footer: 'mt-2!',
        }}
        suffix={false}
        footer={
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <Tooltip title={visualEditTooltipTitle}>
                <span className="inline-flex">
                  <Button
                    htmlType="button"
                    disabled={!isVisualEditMode && !canEnableVisualEdit}
                    aria-pressed={isVisualEditMode}
                    onClick={handleToggleVisualEditMode}
                    icon={
                      <Crosshair
                        className="size-4"
                        aria-hidden="true"
                      />
                    }
                    className={
                      isVisualEditMode
                        ? composerActiveActionButtonClassName
                        : composerInactiveActionButtonClassName
                    }
                  >
                    编辑
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={chatModeTooltipTitle}>
                <span className="inline-flex">
                  <Button
                    htmlType="button"
                    disabled={Boolean(isSubmitting || !canChat || isVisualEditMode)}
                    aria-pressed={isChatMode}
                    onClick={handleToggleChatMode}
                    icon={
                      <MessagesSquare
                        className="size-4"
                        aria-hidden="true"
                      />
                    }
                    className={
                      isChatMode
                        ? composerActiveActionButtonClassName
                        : composerInactiveActionButtonClassName
                    }
                  >
                    对话
                  </Button>
                </span>
              </Tooltip>
            </div>
            <Tooltip title={sendTooltipTitle}>
              <span className="inline-flex">
                <Button
                  htmlType="button"
                  type="primary"
                  shape="circle"
                  loading={isSubmitting}
                  disabled={isSendDisabled}
                  onClick={() => handleSubmit(prompt)}
                  aria-label="发送消息"
                  icon={
                    <ArrowUp
                      className="size-5"
                      aria-hidden="true"
                    />
                  }
                  className="size-10! shrink-0! border-0! bg-slate-950! text-white! shadow-sm! shadow-slate-950/20! transition-all hover:bg-slate-800! disabled:bg-slate-300!"
                />
              </span>
            </Tooltip>
          </div>
        }
      />
    </div>
  )
}
