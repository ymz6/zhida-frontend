import zhidaLogo from '@/assets/zhida-logo.svg'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Avatar, Button, ConfigProvider, Dropdown, Flex, Layout, Menu, Typography } from 'antd'
import type { MenuProps } from 'antd'
import {
  AppWindow,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  House,
  LogOut,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

const { Link: TypographyLink, Text } = Typography

const adminMenuItems = [
  {
    key: '/admin',
    label: '控制台',
    icon: <House className="size-4" />,
  },
  {
    key: '/admin/apps',
    label: '应用管理',
    icon: <AppWindow className="size-4" />,
  },
  {
    key: '/admin/users',
    label: '用户管理',
    icon: <Users className="size-4" />,
  },
  {
    key: 'team',
    label: '组织与权限',
    icon: <Users className="size-4" />,
    children: [
      {
        key: '/admin/roles',
        label: '角色权限',
        icon: <ShieldCheck className="size-4" />,
      },
    ],
  },
] satisfies NonNullable<MenuProps['items']>

// 从菜单树里提取两类元数据。
// 这套逻辑按递归方式处理菜单树，因此不限制嵌套层级；只要菜单继续遵守当前约定，就能一直生效：
// 1. 真正可跳转的叶子菜单 key 以 '/' 开头，例如 '/admin/roles'
// 2. 纯父级分组 key 不以 '/' 开头，例如 'team'、'roles'
//
// 返回结果包含：
// 1. selectableRoutes：所有可用于路由匹配的叶子菜单 key
// 2. parentMap：某个叶子菜单对应的整条祖先 key 链，用于自动展开父级菜单
function getMenuMeta(items: NonNullable<MenuProps['items']>, ancestorKeys: string[] = []) {
  const selectableRoutes: string[] = []
  const parentMap: Record<string, string[]> = {}

  items.forEach((item) => {
    if (!item || !('key' in item) || typeof item.key !== 'string') return

    if (item.key.startsWith('/')) {
      selectableRoutes.push(item.key)

      if (ancestorKeys.length > 0) {
        parentMap[item.key] = ancestorKeys
      }
    }

    if ('children' in item && Array.isArray(item.children) && item.children.length > 0) {
      const nextAncestorKeys = item.key.startsWith('/') ? ancestorKeys : [...ancestorKeys, item.key]
      const childMeta = getMenuMeta(item.children, nextAncestorKeys)
      selectableRoutes.push(...childMeta.selectableRoutes)
      Object.assign(parentMap, childMeta.parentMap)
    }
  })

  return {
    selectableRoutes: selectableRoutes.sort((left, right) => right.length - left.length),
    parentMap,
  }
}

// 菜单结构在模块加载时固定，元数据只需计算一次，后续渲染直接复用。
const menuMeta = getMenuMeta(adminMenuItems)

// 通过“最长前缀匹配”判断当前路径应该高亮哪个叶子菜单。
// 例如 '/admin/roles/permissions' 会优先命中更长的 '/admin/roles/permissions'，
// 而不是较短的 '/admin'。
function getSelectedKey(pathname: string) {
  return menuMeta.selectableRoutes.find((route) => pathname.startsWith(route)) ?? '/admin'
}

// 根据当前选中的叶子菜单，取出它对应的整条祖先 key 链。
// 这样在三级或更深层级下，也能一次性展开所有父菜单。
function getOpenKeys(selectedKey: string) {
  return menuMeta.parentMap[selectedKey] ?? []
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  // 当前路由对应的菜单高亮项。
  const selectedKey = getSelectedKey(location.pathname)
  const [collapsed, setCollapsed] = useState(false)
  // 当前展开的父级菜单；初始值根据选中的子菜单反推。
  const [openKeys, setOpenKeys] = useState<string[]>(() => getOpenKeys(selectedKey))
  // 控制右上角用户下拉菜单的展开状态，用来驱动箭头翻转。
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const parentKeys = getOpenKeys(selectedKey)

    if (parentKeys.length === 0) return

    // 路由切换到子菜单时，确保它的父菜单保持展开。
    setOpenKeys((prev) => [...new Set([...prev, ...parentKeys])])
  }, [selectedKey])

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const targetKey = String(key)

    // 当前只保留 /admin 作为真实路由，其它菜单项先保留信息架构。
    if (targetKey === '/admin') {
      void navigate({ to: '/admin' })
      return
    }
  }

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    // 点击菜单项后先关闭下拉，再执行跳转。
    setUserMenuOpen(false)

    if (key === 'site') {
      void navigate({ to: '/' })
      return
    }
  }

  return (
    <Layout className="min-h-screen bg-[#f7f7f5] text-slate-900">
      <Layout.Header className="fixed inset-x-0 top-0 z-50 h-18! border-b border-stone-200/85 bg-[#fffefd]/82 px-0! backdrop-blur-sm">
        <Flex
          align="center"
          justify="space-between"
          className="h-full px-5 lg:px-7"
        >
          <Flex
            align="center"
            gap={12}
            className="min-w-0"
          >
            <div className="shrink-0">
              <img
                src={zhidaLogo}
                alt="智搭 Logo"
                className="size-14"
              />
            </div>
            <div className="min-w-0">
              <Text className="block truncate text-2xl font-semibold tracking-tight text-slate-900">
                智搭后台
              </Text>
            </div>
          </Flex>

          <Dropdown
            menu={{
              items: [
                {
                  key: 'site',
                  label: '前台系统',
                  icon: <Globe className="size-4" />,
                },
                {
                  key: 'logout',
                  label: '退出登录',
                  danger: true,
                  icon: <LogOut className="size-4" />,
                },
              ],
              onClick: handleUserMenuClick,
            }}
            open={userMenuOpen}
            onOpenChange={setUserMenuOpen}
            placement="bottomRight"
            arrow
          >
            <Button
              type="text"
              className="group h-auto! rounded-2xl! px-2! py-1! text-inherit! shadow-none! hover:bg-[#f7f7f4]!"
            >
              <Flex
                align="center"
                gap={12}
              >
                <Avatar className="bg-slate-900! text-xs! font-semibold!">A</Avatar>
                <Flex
                  vertical
                  className="text-left"
                >
                  <Text className="block truncate text-sm font-medium text-slate-800">管理员</Text>
                </Flex>
                <ChevronDown
                  className={`size-4 text-slate-400 transition-[color,transform] duration-200 group-hover:text-slate-600 ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </Flex>
            </Button>
          </Dropdown>
        </Flex>
      </Layout.Header>
      <Layout
        hasSider
        className="bg-transparent pt-18"
      >
        <Layout.Sider
          width={248}
          collapsedWidth={80}
          collapsed={collapsed}
          trigger={null}
          className="sticky top-18 h-[calc(100vh-72px)] overflow-visible! border-r! border-stone-200/85! bg-transparent!"
        >
          <div className="relative flex h-full flex-col bg-[#fffefd]/62 backdrop-blur-sm">
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              <ConfigProvider
                theme={{
                  components: {
                    Menu: {
                      itemBg: 'transparent',
                      subMenuItemBg: 'transparent',
                      itemMarginInline: 4,
                      itemMarginBlock: 4,
                      itemColor: '#525252',
                      itemHoverColor: '#525252',
                      itemSelectedBg: '#f3f4f6',
                      itemSelectedColor: '#2563eb',
                      itemActiveBg: '#f5f5f4',
                      itemBorderRadius: 12,
                      subMenuItemBorderRadius: 12,
                      subMenuItemSelectedColor: '#2563eb',
                    },
                  },
                }}
              >
                <Menu
                  mode="inline"
                  inlineCollapsed={collapsed}
                  items={adminMenuItems}
                  selectedKeys={[selectedKey]}
                  openKeys={openKeys}
                  onOpenChange={setOpenKeys}
                  onClick={handleMenuClick}
                  className="border-none! bg-transparent! [&_.ant-menu-item]:text-stone-600 [&_.ant-menu-item-icon]:text-stone-500 [&_.ant-menu-item-selected_.ant-menu-item-icon]:text-blue-600 [&_.ant-menu-submenu-title]:text-stone-600 [&_.ant-menu-submenu-title_.ant-menu-item-icon]:text-stone-500 [&_.ant-menu-submenu-selected>.ant-menu-submenu-title]:text-blue-600 [&_.ant-menu-submenu-selected>.ant-menu-submenu-title_.ant-menu-item-icon]:text-blue-600"
                />
              </ConfigProvider>
            </div>

            <Button
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
              shape="circle"
              icon={
                collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />
              }
              className="absolute -right-3 top-16 z-10 size-7! min-w-7! border-stone-200! bg-[#fffefd]! p-0! text-stone-400! shadow-sm transition-colors hover:text-blue-500!"
            />
          </div>
        </Layout.Sider>
        <Layout className="min-h-[calc(100vh-72px)] bg-transparent">
          <Layout.Content className="flex-1 p-6">{children}</Layout.Content>
          <Layout.Footer className="bg-transparent! px-6! py-4!">
            <Flex
              align="center"
              justify="center"
              gap={10}
              wrap="wrap"
            >
              <Text className="text-sm text-slate-400">
                © {new Date().getFullYear()}{' '}
                <Text className="font-medium text-slate-600">智搭低代码应用生成系统</Text>
              </Text>
              <Text className="text-sm text-slate-300">·</Text>
              <Text className="text-sm text-slate-400">
                Designed by{' '}
                <TypographyLink
                  href="https://github.com/ymz6"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-sky-500! no-underline! hover:text-sky-600!"
                >
                  ymz
                </TypographyLink>
              </Text>
            </Flex>
          </Layout.Footer>
        </Layout>
      </Layout>
    </Layout>
  )
}
