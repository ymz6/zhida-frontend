import { openAppFile, useOpenAppFile } from '@/api/generated/endpoints/app'
import { FileNodeType, type FileNode } from '@/api/generated/models'
import { CodeHighlighter } from '@ant-design/x'
import { Alert, Button, Empty, Spin, Splitter, Tree } from 'antd'
import type { TreeDataNode, TreeProps } from 'antd'
import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const { DirectoryTree } = Tree

const languageByExtension: Record<string, string> = {
  cjs: 'javascript',
  htm: 'markup',
  html: 'markup',
  js: 'javascript',
  mjs: 'javascript',
  md: 'markdown',
  sh: 'bash',
  yml: 'yaml',
}

interface CodeTreeNode extends TreeDataNode {
  key: string
  title: string
  isLeaf: boolean
  children?: CodeTreeNode[]
}

interface SelectedFile {
  path: string
  title: string
  content: string
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return '代码加载失败，请稍后重试。'
}

function toCodeTreeNode(node: FileNode): CodeTreeNode {
  return {
    key: node.path!,
    title: node.title!,
    isLeaf: node.type === FileNodeType.file,
  }
}

function updateTreeChildren(
  nodes: CodeTreeNode[],
  targetKey: string,
  children: CodeTreeNode[],
): CodeTreeNode[] {
  return nodes.map((node) => {
    if (node.key === targetKey) {
      return {
        ...node,
        children,
      }
    }

    if (!node.children) {
      return node
    }

    // 只遍历已加载的目录节点，用于把懒加载结果挂到当前展开的目录下。
    return {
      ...node,
      children: updateTreeChildren(node.children, targetKey, children),
    }
  })
}

function getLanguageFromPath(path: string) {
  const extension = path.split('.').filter(Boolean).at(-1) || 'txt'

  return languageByExtension[extension] ?? extension
}

export function CodeContent({ appId }: { appId?: string }) {
  const latestFileRequestRef = useRef(0)
  const [treeData, setTreeData] = useState<CodeTreeNode[]>([])
  const [treeErrorMessage, setTreeErrorMessage] = useState<string>()
  const [selectedFile, setSelectedFile] = useState<SelectedFile>()
  const [fileErrorMessage, setFileErrorMessage] = useState<string>()
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const codeTreeQuery = useOpenAppFile<FileNode | undefined, { message?: string }>(
    appId ?? '',
    undefined,
    {
      query: {
        enabled: Boolean(appId),
        select: (response) => response.data,
      },
    },
  )

  useEffect(() => {
    const rootNode = codeTreeQuery.data

    if (!rootNode) {
      setTreeData([])
    } else if (rootNode.title === '/' || rootNode.path === '/') {
      setTreeData(rootNode.children?.map((node) => toCodeTreeNode(node)) ?? [])
    } else {
      setTreeData([
        {
          ...toCodeTreeNode(rootNode),
          children: rootNode.children?.map((node) => toCodeTreeNode(node)),
        },
      ])
    }

    setTreeErrorMessage(undefined)
    setSelectedFile(undefined)
    setFileErrorMessage(undefined)
    setIsLoadingFile(false)
  }, [codeTreeQuery.data])

  const handleRefresh = () => {
    setSelectedFile(undefined)
    setFileErrorMessage(undefined)
    setTreeErrorMessage(undefined)
    void codeTreeQuery.refetch()
  }

  const handleLoadData = async (treeNode: CodeTreeNode) => {
    if (!appId || treeNode.isLeaf || treeNode.children) {
      return
    }

    try {
      const response = await openAppFile(appId, { path: treeNode.key })
      const children = response.data?.children?.map((node) => toCodeTreeNode(node)) ?? []

      setTreeData((currentTreeData) => updateTreeChildren(currentTreeData, treeNode.key, children))
      setTreeErrorMessage(undefined)
    } catch (error) {
      setTreeErrorMessage(getErrorMessage(error))
    }
  }

  const handleSelect: TreeProps<CodeTreeNode>['onSelect'] = (_selectedKeys, info) => {
    const node = info.node

    if (!appId || !node.isLeaf) {
      return
    }

    const requestId = latestFileRequestRef.current + 1
    latestFileRequestRef.current = requestId
    setSelectedFile({
      path: node.key,
      title: String(node.title),
      content: '',
    })
    setFileErrorMessage(undefined)
    setIsLoadingFile(true)

    void openAppFile(appId, { path: node.key })
      .then((response) => {
        if (latestFileRequestRef.current !== requestId) {
          return
        }

        setSelectedFile({
          path: node.key,
          title: String(node.title),
          content: response.data?.content ?? '',
        })
      })
      .catch((error) => {
        if (latestFileRequestRef.current === requestId) {
          setFileErrorMessage(getErrorMessage(error))
        }
      })
      .finally(() => {
        if (latestFileRequestRef.current === requestId) {
          setIsLoadingFile(false)
        }
      })
  }

  const renderCodePreview = () => {
    if (isLoadingFile) {
      return (
        <div className="flex h-full items-center justify-center">
          <Spin />
        </div>
      )
    }

    if (fileErrorMessage) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <Alert
            type="error"
            showIcon
            title="文件加载失败"
            description={fileErrorMessage}
          />
        </div>
      )
    }

    if (!selectedFile) {
      return (
        <div className="flex h-full items-center justify-center">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请选择文件"
          />
        </div>
      )
    }

    return (
      <div className="flex h-full min-h-0 flex-col bg-white">
        <div className="flex h-10 shrink-0 items-center border-b border-slate-200 bg-white px-3 font-mono text-xs text-slate-600">
          {selectedFile.path}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden bg-slate-50">
          <CodeHighlighter
            lang={getLanguageFromPath(selectedFile.path)}
            header={false}
            className="h-full"
            classNames={{
              code: 'h-full! overflow-auto! rounded-none! border-0! bg-transparent! [&>code]:hidden',
            }}
          >
            {selectedFile.content}
          </CodeHighlighter>
        </div>
      </div>
    )
  }

  if (codeTreeQuery.isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-white">
        <Spin />
      </div>
    )
  }

  if (codeTreeQuery.isError) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-white p-6">
        <Alert
          type="error"
          showIcon
          title="代码加载失败"
          description={getErrorMessage(codeTreeQuery.error)}
          action={
            <Button
              size="small"
              onClick={handleRefresh}
            >
              重试
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-3">
        <span className="text-sm font-medium text-slate-700">源代码</span>
        <Button
          type="text"
          size="small"
          icon={
            <RefreshCw
              className="size-4"
              aria-hidden="true"
            />
          }
          loading={codeTreeQuery.isFetching}
          disabled={!appId}
          onClick={handleRefresh}
          aria-label="刷新代码"
        />
      </div>

      {treeErrorMessage && (
        <Alert
          type="error"
          showIcon
          banner
          title={treeErrorMessage}
        />
      )}

      <Splitter className="min-h-0 flex-1">
        <Splitter.Panel
          defaultSize={280}
          min={220}
          max="45%"
        >
          <div className="h-full overflow-auto border-r border-slate-200 px-2 py-2">
            {treeData.length > 0 ? (
              <DirectoryTree<CodeTreeNode>
                blockNode
                showIcon
                treeData={treeData}
                loadData={(node) => handleLoadData(node as CodeTreeNode)}
                onSelect={handleSelect}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="等待生成代码"
                />
              </div>
            )}
          </div>
        </Splitter.Panel>

        <Splitter.Panel min={280}>
          <div className="h-full min-w-0 overflow-hidden">{renderCodePreview()}</div>
        </Splitter.Panel>
      </Splitter>
    </div>
  )
}
