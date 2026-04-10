# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
pnpm dev
pnpm build
pnpm format         # 格式化代码
pnpm format:check   # 检查代码格式
pnpm gen:api        # 从 OpenAPI 规范生成 API 客户端代码
```

## 架构概览

### 技术栈

- React 19
- TypeScript
- Vite 7
- Ant Design v6
- Tailwind CSS v4
- TanStack Router/Query
- Zustand
- Axios

### 项目目录结构

```
src/
├── api/                          # API 层
│   ├── generated/                # orval 生成的代码（禁止修改）
│   │   ├── endpoints/            # 接口调用代码
│   │   └── models/               # 接口相关类型定义
│   │       └── operations/       # 按具体接口生成的参数/请求体/响应类型
│   └── mutator/                  # Axios 自定义实例
├── assets/       # 静态资源
├── features/     # 功能模块（按功能划分子文件夹）
├── layouts/      # 布局组件
├── routes/       # 路由定义（TanStack Router 文件系统路由）
├── stores/       # Zustand 仓库
├── index.css     # 全局样式
└── main.tsx      # 应用入口
```

### React Compiler

本项目已经配置好 React Compiler，大部分情况均无需手动使用 `useMemo`/`useCallback` 等 Hooks 进行优化

### 功能模块组织方式

- 严格遵循 Feature-Based 模式，按功能划分子文件夹
- 在每一个子文件夹中按需组织当前功能私有的 `pages`、`components`、`hooks`、`services`、`utils`、`schemas` 等目录
- 不要过度封装。对于只服务单一页面或单一组件的常量、格式化、校验、派生字段等轻量逻辑，优先直接放在对应页面或组件内部

### 路由

- 路由相关的问题积极使用相关 Skill
- 路由组中的`route.tsx` 仅负责路由声明、布局挂载、路由级守卫、重定向等路由相关逻辑，不承载复杂页面业务实现
- 路由组的布局组件统一组织在在 `src/layouts/` 下，按 `BasicLayout` 这种目录方式组织
- 页面实现必须放在 `src/features/*/pages` 中，路由文件只负责从 `features` 导入页面组件

### 样式

- 优先使用相关 Skill 设计样式
- 必须使用 Tailwind CSS V4 实现样式，不要使用旧版本的写法
- 禁止通过编写原生 CSS 代码、内联样式来实现样式，若 Tailwind 无法合理表达目标样式，则告知用户
- Tailwind 工具类可以覆盖 Ant Design 样式
- 图标组件库优先使用 lucide，而非 antd-icons

### Antd

- `message`、`notification`、`modal` 必须通过 `App.useApp()` 获取实例后使用，禁止直接使用静态方法
- 新增界面优先复用 Ant Design 现有组件能力，不重复造基础交互组件
- 所有危险操作（如退出登录、删除、清空等）在执行前必须进行二次确认，请使用 Ant Design 的 `Popconfirm` 或通过 `App.useApp()` 获取的 `modal.confirm` 实现确认交互

### 非必要不构建

并不是每一次修改都需要执行构建或完整校验。若仅修改注释、纯文案、Markdown、README、无逻辑影响的样式类名微调等内容，通常不需要构建

### API 层

- 项目中的所有请求代码/ React Query hooks 均由 orval 生成到 `src/api/generated`中，严禁编辑此目录下的所有代码
- 自定义 Axios 实例位于 `src/api/mutator/custom-instance.ts`，按需进行补充
