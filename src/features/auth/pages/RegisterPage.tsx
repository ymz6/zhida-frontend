import { useNavigate } from '@tanstack/react-router'
import { App, Button, Form, Input } from 'antd'
import { Lock, ShieldCheck, User } from 'lucide-react'

export function RegisterPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const handleFinish = async (values: any) => {
    try {
      // TODO 发起注册请求
      message.success('注册成功，请登录')
      void navigate({ to: '/auth/login' })
    } catch (e: any) {
      message.error(`注册失败：${e.message}`)
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
        rules={[
          { required: true, message: '请输入账号' },
          {
            min: 3,
            max: 32,
            message: '账号长度需为 3 到 32 个字符',
          },
          {
            pattern: /^[A-Za-z0-9_]+$/,
            message: '账号仅支持字母、数字和下划线',
          },
        ]}
      >
        <Input
          prefix={<User />}
          placeholder="请输入账号"
          autoComplete="username"
          maxLength={32}
          className="h-11 rounded-lg"
        />
      </Form.Item>

      <Form.Item
        name="password"
        validateFirst
        rules={[
          { required: true, message: '请设置密码' },
          {
            min: 6,
            message: '密码长度不能少于6位',
          },
        ]}
      >
        <Input.Password
          prefix={<Lock />}
          placeholder="请设置密码"
          autoComplete="new-password"
          maxLength={255}
          className="h-11 rounded-lg"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          { required: true, message: '请再次输入密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve()
              }

              return Promise.reject(new Error('两次输入的密码不一致'))
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<ShieldCheck />}
          placeholder="请再次输入密码"
          autoComplete="new-password"
          maxLength={255}
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
          注册
        </Button>
      </div>
    </Form>
  )
}
