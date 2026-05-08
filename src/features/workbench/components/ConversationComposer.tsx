import { ChatRequestMode } from '@/api/generated/models'
import { Sender } from '@ant-design/x'
import { Button, Tooltip } from 'antd'
import { ArrowUp, Crosshair, MessagesSquare } from 'lucide-react'
import { useState } from 'react'

const composerActionButtonClassName =
  'h-8! rounded-full! border-0! px-3! text-sm! font-medium! shadow-none! [&_.ant-btn-icon]:inline-flex! [&_.ant-btn-icon]:items-center!'
const composerInactiveActionButtonClassName = `${composerActionButtonClassName} bg-white! text-slate-700! hover:bg-white! hover:text-slate-900!`
const composerActiveActionButtonClassName = `${composerActionButtonClassName} bg-slate-900! text-white! hover:bg-slate-800! hover:text-white!`

export function ConversationComposer({
  canCode,
  canChat,
  isSubmitting,
  onSubmitMessage,
}: {
  canCode?: boolean
  canChat?: boolean
  isSubmitting?: boolean
  onSubmitMessage: (prompt: string, mode: ChatRequestMode) => boolean
}) {
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<ChatRequestMode>(ChatRequestMode.CODE)

  const canSubmitCurrentMode = mode === ChatRequestMode.CHAT ? Boolean(canChat) : Boolean(canCode)
  const isComposerDisabled = Boolean(isSubmitting || !canSubmitCurrentMode)
  const isPromptEmpty = prompt.trim().length === 0
  const isSendDisabled = Boolean(isComposerDisabled || isPromptEmpty)
  const isChatMode = mode === ChatRequestMode.CHAT
  const disabledReason = (() => {
    if (isSubmitting) {
      return '当前任务完成后可继续输入'
    }

    if (mode === ChatRequestMode.CHAT && !canChat) {
      return '应用生成成功后可进行答疑'
    }

    if (mode === ChatRequestMode.CODE && !canCode) {
      return '当前状态暂不能生成或修改'
    }

    return undefined
  })()
  const sendTooltipTitle = disabledReason ?? (isPromptEmpty ? '请输入内容后发送' : undefined)
  const chatModeTooltipTitle = (() => {
    if (isSubmitting) {
      return '当前任务完成后可切换对话模式'
    }

    if (!canChat) {
      return '应用生成成功后可进行答疑'
    }

    return isChatMode ? '已开启对话模式，点击切回生成模式' : '切换为对话答疑模式'
  })()

  const handleToggleChatMode = () => {
    if (isSubmitting) {
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

    if (onSubmitMessage(nextPrompt, mode)) {
      setPrompt('')
    }
  }

  return (
    <div className="relative shrink-0 bg-white px-4 pt-3 pb-4">
      <div className="pointer-events-none absolute inset-x-0 -top-5 h-5 bg-linear-to-b from-white/0 to-white" />
      <Sender
        value={prompt}
        onChange={(v) => setPrompt(v)}
        onSubmit={handleSubmit}
        disabled={isComposerDisabled}
        loading={isSubmitting}
        autoSize={{ minRows: 1, maxRows: 6 }}
        placeholder={
          mode === ChatRequestMode.CHAT
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
              <Tooltip title="可视化编辑暂未开放">
                <span className="inline-flex">
                  <Button
                    htmlType="button"
                    disabled
                    icon={
                      <Crosshair
                        className="size-4"
                        aria-hidden="true"
                      />
                    }
                    className={`${composerInactiveActionButtonClassName} disabled:bg-white! disabled:text-slate-400!`}
                  >
                    编辑
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={chatModeTooltipTitle}>
                <span className="inline-flex">
                  <Button
                    htmlType="button"
                    disabled={Boolean(isSubmitting || !canChat)}
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
