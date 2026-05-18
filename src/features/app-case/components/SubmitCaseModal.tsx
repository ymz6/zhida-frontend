import { Button, Flex, Modal } from 'antd'

/**
 * @deprecated 旧案例投稿弹窗已暂停接入，等待新的案例流程。
 */
export function SubmitCaseModal({
  appId: _appId,
  initialTitle: _initialTitle,
  initialSummary: _initialSummary,
  open,
  onCancel,
  onSuccess: _onSuccess,
}: {
  appId?: string
  initialTitle?: string
  initialSummary?: string
  open: boolean
  onCancel: () => void
  onSuccess?: () => void
}) {
  return (
    <Modal
      title="提交案例"
      open={open}
      centered
      destroyOnHidden
      onCancel={onCancel}
      footer={
        <Flex
          justify="end"
          gap={12}
        >
          <Button
            onClick={onCancel}
            className="rounded-full"
          >
            关闭
          </Button>
        </Flex>
      }
    >
      <p className="m-0 text-sm leading-6 text-slate-500">
        旧案例投稿接口已暂时移除，后续会随新的案例流程重新接入。
      </p>
    </Modal>
  )
}
