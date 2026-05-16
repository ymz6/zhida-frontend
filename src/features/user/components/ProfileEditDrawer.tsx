import type { ProfileEditFormValues, ProfileInfo } from '@/features/user/types'
import { Button, Drawer, Flex, Form, Input } from 'antd'
import { useEffect } from 'react'

export function ProfileEditDrawer({
  open,
  profile,
  width,
  onClose,
  onSubmit,
}: {
  open: boolean
  profile: ProfileInfo
  width: number | string
  onClose: () => void
  onSubmit: (values: ProfileEditFormValues) => void
}) {
  const [form] = Form.useForm<ProfileEditFormValues>()

  useEffect(() => {
    if (!open) {
      return
    }

    form.setFieldsValue({
      nickname: profile.nickname ?? '',
      profile: profile.profile ?? '',
    })
  }, [form, open, profile.nickname, profile.profile])

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  const handleSubmit = (values: ProfileEditFormValues) => {
    onSubmit({
      nickname: values.nickname.trim(),
      profile: values.profile.trim(),
    })
    form.resetFields()
  }

  return (
    <Drawer
      title="编辑用户信息"
      placement="right"
      open={open}
      onClose={handleClose}
      size={width}
      footer={
        <Flex
          justify="end"
          gap={12}
        >
          <Button
            onClick={handleClose}
            className="rounded-full"
          >
            取消
          </Button>
          <Button
            type="primary"
            onClick={() => void form.submit()}
            className="rounded-full px-5 shadow-none"
          >
            保存
          </Button>
        </Flex>
      }
    >
      <Form
        form={form}
        layout="vertical"
        colon={false}
        requiredMark={false}
        onFinish={handleSubmit}
        className="[&_.ant-form-item]:mb-5"
      >
        <Form.Item
          name="nickname"
          label="昵称"
          htmlFor="profile-edit-nickname"
          validateFirst
          rules={[
            {
              validator: (_, value: string | undefined) => {
                if (!value?.trim()) {
                  return Promise.reject(new Error('昵称不能为空'))
                }

                return Promise.resolve()
              },
            },
            {
              max: 10,
              message: '昵称最多10个字符',
            },
          ]}
        >
          <Input
            id="profile-edit-nickname"
            placeholder="请输入昵称"
            maxLength={10}
            showCount
            className="h-11 rounded-xl"
          />
        </Form.Item>

        <Form.Item
          name="profile"
          label="个人简介"
          htmlFor="profile-edit-profile"
          validateFirst
          rules={[
            {
              max: 100,
              message: '个人简介最多100个字符',
            },
          ]}
        >
          <Input.TextArea
            id="profile-edit-profile"
            rows={5}
            maxLength={100}
            allowClear
            showCount
            placeholder="介绍一下自己吧"
            className="rounded-2xl"
          />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
