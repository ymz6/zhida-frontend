import { Avatar, Button, Input, Switch } from 'antd'
import { UserOutlined } from '@ant-design/icons'

export function SettingsContent() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto bg-white p-6 sm:p-8">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="mb-6 text-xl font-semibold text-slate-900">应用设置</h2>

        <div className="space-y-8">
          {/* 基本信息 */}
          <section>
            <h3 className="mb-4 text-sm font-medium text-slate-900">基本信息</h3>
            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-600">应用名称</label>
                <Input
                  defaultValue="咖啡店会员管理后台"
                  placeholder="给应用起个响亮的名字"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-600">应用描述</label>
                <Input.TextArea
                  defaultValue="包含订单、积分和活动配置，整体风格清爽易用。"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  placeholder="简单描述一下应用的功能"
                />
              </div>
              <div className="pt-2">
                <label className="mb-2 block text-sm text-slate-600">创建者</label>
                <div className="flex items-center gap-3">
                  <Avatar
                    icon={<UserOutlined />}
                    src="https://api.dicebear.com/7.x/miniavs/svg?seed=1"
                    size="default"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Admin</div>
                    <div className="text-xs text-slate-500">创建于 2026-04-28 10:30:00</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 运行配置 */}
          <section>
            <h3 className="mb-4 text-sm font-medium text-slate-900">运行配置</h3>
            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-900">公开访问</div>
                  <div className="text-xs text-slate-500">允许任何人通过链接访问该应用</div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </section>

          {/* 危险操作 */}
          <section>
            <h3 className="mb-4 text-sm font-medium text-red-600">危险操作</h3>
            <div className="rounded-xl border border-red-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-red-600">删除应用</div>
                  <div className="text-xs text-red-500/80">此操作无法撤销，请谨慎操作</div>
                </div>
                <Button danger>删除</Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
