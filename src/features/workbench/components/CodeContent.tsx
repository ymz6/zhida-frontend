import { Folder } from '@ant-design/x'
import type { FolderProps } from '@ant-design/x'

const treeData: FolderProps['treeData'] = [
  {
    title: 'src',
    path: 'src',
    children: [
      {
        title: 'components',
        path: 'src/components',
      },
      {
        title: 'App.tsx',
        path: 'src/App.tsx',
        content: `export default function App() {\n  return <div>Hello World</div>\n}`,
      },
    ],
  },
  {
    title: 'package.json',
    path: 'package.json',
    content: `{\n  "name": "ai-app",\n  "version": "1.0.0"\n}`,
  },
]

export function CodeContent() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <Folder
        treeData={treeData}
        defaultExpandAll
        className="h-full"
        emptyRender={() => (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="max-w-sm text-center">
              <p className="text-base text-gray-500">等待生成代码</p>
              <p className="mt-2 text-xs text-gray-400">应用生成后，这里将展示实时源代码。</p>
            </div>
          </div>
        )}
      />
    </div>
  )
}
