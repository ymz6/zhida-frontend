import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// TanStack
import { queryClient } from './libs/query-client'
import { router } from './libs/router'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'

// Ant Design
import { StyleProvider } from '@ant-design/cssinjs'
import { App, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
// for date-picker i18n
import 'dayjs/locale/zh-cn'
import { XProvider } from '@ant-design/x'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyleProvider layer>
      <XProvider>
        <ConfigProvider locale={zhCN}>
          <App>
            <QueryClientProvider client={queryClient}>
              <RouterProvider router={router} />
            </QueryClientProvider>
          </App>
        </ConfigProvider>
      </XProvider>
    </StyleProvider>
  </StrictMode>,
)
