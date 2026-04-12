import { useNavigate } from '@tanstack/react-router'
import { App, Button, Form, Input } from 'antd'
import { Lock, User } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const handleFinish = async (values: any) => {
    try {
      // TODO 发起登录请求
      message.success('登录成功')
      void navigate({ to: '/' })
    } catch (e: any) {
      message.error(e?.message || '登录失败')
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      size="large"
      colon={false}
      requiredMark={false}
      scrollToFirstError
      onFinish={(values) => void handleFinish(values)}
      className="flex h-full w-full flex-col [&_.ant-form-item]:mb-5"
    >
      <Form.Item
        name="account"
        validateFirst
        rules={[{ required: true, message: '请输入账号' }]}
      >
        <Input
          prefix={<User />}
          placeholder="请输入账号"
          autoComplete="username"
          className="h-11 rounded-lg"
        />
      </Form.Item>

      <Form.Item
        name="password"
        validateFirst
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password
          prefix={<Lock />}
          placeholder="请输入密码"
          autoComplete="current-password"
          className="h-11 rounded-lg"
        />
      </Form.Item>

      <div className="mt-6">
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          className="h-11 rounded-lg font-medium shadow-none"
        >
          登录
        </Button>
      </div>
    </Form>
  )
}
