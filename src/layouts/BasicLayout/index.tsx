import { useLocation, useNavigate } from '@tanstack/react-router'
import { Layout, Avatar, Dropdown, Menu } from 'antd'
import type { MenuProps } from 'antd'
import type { ReactNode } from 'react'
import reactLogo from '@/assets/react.svg'

/**
 *  基础的上中下布局
 */
export default function BasicLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { key: '/', label: '首页' },
    { key: '/about', label: '关于' },
  ]

  const menuItems: MenuProps['items'] = navItems.map((item) => ({
    key: item.key,
    label: item.label,
  }))

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate({ to: key })
  }

  const dropdownItems: MenuProps['items'] = [
    { key: 'profile', label: '个人中心' },
    { key: 'settings', label: '设置' },
    { type: 'divider' },
    { key: 'logout', label: '退出登录', danger: true },
  ]

  // 用“最长前缀匹配”确定当前激活导航：/aaa/bbb 会命中 /aaa；多个命中取最长；'/' 仅在根路径激活
  const activeNavKey =
    navItems
      .filter((item) => item.key !== '/' && location.pathname.startsWith(item.key))
      .reduce<string>((best, item) => (item.key.length > best.length ? item.key : best), '') ||
    (location.pathname === '/' ? '/' : '')

  return (
    <Layout className="min-h-screen">
      <Layout.Header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 px-0 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          {/* Logo + 项目名称 */}
          <div className="flex shrink-0 items-center gap-2.5">
            <img
              src={reactLogo}
              alt="Logo"
              className="h-7 w-7"
            />
            <span className="text-base font-semibold text-slate-800">Project Name</span>
          </div>

          {/* 导航菜单 */}
          <div className="flex min-w-0 flex-1 pl-8">
            <Menu
              mode="horizontal"
              items={menuItems}
              selectedKeys={[activeNavKey]}
              onClick={handleMenuClick}
              className="flex-1 min-w-0 border-none! bg-transparent!"
            />
          </div>

          {/* 用户区域 */}
          <Dropdown
            menu={{ items: dropdownItems }}
            placement="bottom"
          >
            <button className="group flex shrink-0 cursor-pointer items-center gap-2">
              <Avatar size={32}>USER</Avatar>
              <span className="text-sm text-slate-600 transition-colors group-hover:text-slate-900">
                用户
              </span>
            </button>
          </Dropdown>
        </div>
      </Layout.Header>
      <Layout.Content className="p-8">
        <div className="mx-auto w-full max-w-300">{children}</div>
      </Layout.Content>
      <Layout.Footer>
        <div className="text-center">
          <p className="m-0 text-sm text-slate-500">
            © {new Date().getFullYear()}{' '}
            <span className="font-medium text-slate-600">React Frontend Starter</span>. Designed by{' '}
            <a
              href="https://github.com/ymz6"
              target="_blank"
              rel="noreferrer"
              className="text-sky-500 no-underline hover:text-sky-600"
            >
              ymz
            </a>
          </p>
        </div>
      </Layout.Footer>
    </Layout>
  )
}
