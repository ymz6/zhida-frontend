import type { AppChatMessageInfo, AppDetail } from '@/api/generated/models'

import type { WorkbenchChatMessageInfo } from '../utils/conversationTimeline'

const MOCK_PREVIEW_HTML = `
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>客户成功运营台</title>
    <style>
      body {
        margin: 0;
        font-family: Inter, "Microsoft YaHei", Arial, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .shell { padding: 24px; }
      .hero {
        border-radius: 18px;
        background: #0f172a;
        color: white;
        padding: 28px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin-top: 18px;
      }
      .card {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: white;
        padding: 18px;
      }
      .label { color: #64748b; font-size: 13px; }
      .value { margin-top: 8px; font-size: 28px; font-weight: 700; }
      .list { margin-top: 18px; display: grid; gap: 12px; }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        border-radius: 12px;
        background: white;
        border: 1px solid #e2e8f0;
        padding: 14px 16px;
      }
      .tag {
        border-radius: 999px;
        background: #fee2e2;
        color: #b91c1c;
        padding: 4px 10px;
        font-size: 12px;
        height: fit-content;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="label">静态预览</div>
        <h1>客户成功运营台</h1>
        <p>线索跟进、风险提醒、交付看板集中管理。</p>
      </section>
      <section class="grid">
        <div class="card"><div class="label">本周待跟进</div><div class="value">24</div></div>
        <div class="card"><div class="label">高风险客户</div><div class="value">6</div></div>
        <div class="card"><div class="label">交付中项目</div><div class="value">18</div></div>
      </section>
      <section class="list">
        <div class="row"><div><strong>星河制造</strong><div class="label">合同续费风险，需要本周回访</div></div><span class="tag">高风险</span></div>
        <div class="row"><div><strong>云栖零售</strong><div class="label">等待方案确认和交付排期</div></div><span class="tag">跟进中</span></div>
      </section>
    </main>
  </body>
</html>
`

function createMockPreviewUrl() {
  return `data:text/html;charset=utf-8,${encodeURIComponent(MOCK_PREVIEW_HTML)}`
}

export function getMockWorkbenchData(appId: string) {
  const appDetail: AppDetail = {
    id: appId,
    name: '客户成功运营台',
    status: 'READY',
    previewUrl: createMockPreviewUrl(),
    deployStatus: 'DEPLOYED',
    deployUrl: 'https://example.com/zhida/customer-success',
    deployedAt: '2026-05-16 16:30:00',
    initPrompt: '生成一个面向客户成功团队的运营工作台。',
  }

  const persistedMessages = [
    {
      id: 'mock-user-1',
      appId,
      role: 'USER',
      contentType: 'TEXT',
      content: '帮我生成一个面向客户成功团队的运营工作台，需要能看见待跟进客户和风险提醒。',
      createdAt: '2026-05-16 09:42:00',
    },
    {
      id: 'mock-assistant-1',
      appId,
      role: 'ASSISTANT',
      contentType: 'TEXT',
      content: '已生成静态工作台示例，右侧可以查看预览、代码结构和应用设置。',
      createdAt: '2026-05-16 09:43:00',
    },
    {
      id: 'mock-user-2',
      appId,
      role: 'USER',
      contentType: 'TEXT',
      content: '先保留当前页面结构，后端逻辑稍后再接回。',
      createdAt: '2026-05-16 09:44:00',
    },
    {
      id: 'mock-assistant-2',
      appId,
      role: 'ASSISTANT',
      contentType: 'TEXT',
      content: '已切换为示例数据模式，当前不会请求后端，也不会开启 SSE 流式任务。',
      createdAt: '2026-05-16 09:45:00',
    },
  ] satisfies AppChatMessageInfo[]

  const streamMessages: WorkbenchChatMessageInfo[] = []

  return {
    appDetail,
    persistedMessages,
    streamMessages,
  }
}
