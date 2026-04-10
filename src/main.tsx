import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// TanStack
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
const queryClient = new QueryClient()
// Import the generated route tree
import { routeTree } from './routeTree.gen'
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
})
// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Ant Design
import { StyleProvider } from '@ant-design/cssinjs'
import { App, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
// for date-picker i18n
import 'dayjs/locale/zh-cn'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <ConfigProvider locale={zhCN}>
        <App>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </App>
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
)
