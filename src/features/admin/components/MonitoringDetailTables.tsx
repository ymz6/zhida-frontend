import { queryMonitoring } from '@/api/generated/endpoints/admin-monitoring'
import type { MonitoringDashboardRequest, MonitoringTableResult } from '@/api/generated/models'
import type {
  LlmCallLogInfo,
  MonitoringTableResource,
  MonitoringTableState,
  SystemExceptionLogInfo,
  TaskMonitoringStat,
} from '@/features/admin/types/monitoring'
import {
  MONITORING_TABLE_LABELS,
  compactFilters,
  formatDateTime,
  formatMetricValue,
  formatNumber,
  getErrorMessage,
  parseOptionalNumber,
  trimToUndefined,
} from '@/features/admin/utils/monitoring'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  Drawer,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type { TableColumnsType, TablePaginationConfig, TabsProps } from 'antd'
import { Eye, RotateCcw, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

const { Text } = Typography

const TABLE_RESOURCES: MonitoringTableResource[] = ['TASK_STAT', 'EXCEPTION_LOG', 'LLM_CALL_LOG']

const DEFAULT_TABLE_STATE: MonitoringTableState = {
  pageNum: 1,
  pageSize: 10,
}

const DEFAULT_TABLE_STATES: Record<MonitoringTableResource, MonitoringTableState> = {
  TASK_STAT: DEFAULT_TABLE_STATE,
  EXCEPTION_LOG: DEFAULT_TABLE_STATE,
  LLM_CALL_LOG: DEFAULT_TABLE_STATE,
}

const TASK_TYPE_OPTIONS = [
  { label: '创建任务', value: 'CREATE' },
  { label: '迭代任务', value: 'ITERATE' },
  { label: '部署任务', value: 'DEPLOY' },
]

const LLM_STATUS_OPTIONS = [
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
]

interface MonitoringDetailTablesProps {
  range: MonitoringDashboardRequest
}

interface TaskFilterValues {
  taskType?: string
}

interface ExceptionFilterValues {
  exceptionType?: string
  resultCode?: string
  requestPath?: string
}

interface LlmFilterValues {
  scenario?: string
  modelName?: string
  status?: string
  appId?: string
  taskId?: string
}

function getMethodTagColor(method?: string) {
  if (method === 'GET') {
    return 'green'
  }

  if (method === 'POST') {
    return 'blue'
  }

  if (method === 'DELETE') {
    return 'red'
  }

  if (method === 'PUT' || method === 'PATCH') {
    return 'orange'
  }

  return 'default'
}

function getLlmStatusTag(status?: string) {
  if (status === 'SUCCESS') {
    return <Tag color="green">SUCCESS</Tag>
  }

  if (status === 'FAILED') {
    return <Tag color="red">FAILED</Tag>
  }

  return <Tag>{status || '-'}</Tag>
}

function displayText(value?: string | number | null) {
  if (value == null || value === '') {
    return '-'
  }

  return String(value)
}

interface ExceptionDetailFieldProps {
  label: string
  children: ReactNode
  className?: string
  valueClassName?: string
}

function ExceptionDetailField({
  label,
  children,
  className = '',
  valueClassName = 'text-sm text-slate-900',
}: ExceptionDetailFieldProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <Text className="mb-1 block text-xs font-medium text-slate-500">{label}</Text>
      <div className={`min-w-0 ${valueClassName}`}>{children}</div>
    </div>
  )
}

function ExceptionDetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="border-b border-stone-100 pb-2">
        <Text className="text-sm font-semibold text-slate-900">{title}</Text>
      </div>
      {children}
    </section>
  )
}

export function MonitoringDetailTables({ range }: MonitoringDetailTablesProps) {
  const [activeResource, setActiveResource] = useState<MonitoringTableResource>('TASK_STAT')
  const [tableStates, setTableStates] =
    useState<Record<MonitoringTableResource, MonitoringTableState>>(DEFAULT_TABLE_STATES)
  const [selectedException, setSelectedException] = useState<SystemExceptionLogInfo>()
  const [taskFilterValues, setTaskFilterValues] = useState<TaskFilterValues>({})
  const [exceptionFilterValues, setExceptionFilterValues] = useState<ExceptionFilterValues>({})
  const [llmFilterValues, setLlmFilterValues] = useState<LlmFilterValues>({})
  const activeTableState = tableStates[activeResource]

  const tableQuery = useQuery<MonitoringTableResult | undefined, { message?: string }>({
    queryKey: [
      'admin',
      'monitoring',
      'table',
      activeResource,
      range.startTime,
      range.endTime,
      activeTableState,
    ],
    queryFn: async () => {
      const response = await queryMonitoring({
        startTime: range.startTime,
        endTime: range.endTime,
        tableQueries: [
          {
            queryId: activeResource,
            resource: activeResource,
            pageNum: activeTableState.pageNum,
            pageSize: activeTableState.pageSize,
            filters: activeTableState.filters,
          },
        ],
      })

      return response.data?.tables?.find((table) => table.queryId === activeResource)
    },
    placeholderData: (previousData) =>
      previousData?.resource === activeResource || previousData?.queryId === activeResource
        ? previousData
        : undefined,
    retry: false,
  })

  const activeTable = tableQuery.data
  const total = Number(activeTable?.total ?? 0)
  const tabItems: TabsProps['items'] = TABLE_RESOURCES.map((resource) => ({
    key: resource,
    label: MONITORING_TABLE_LABELS[resource],
  }))

  const updateTableState = (
    resource: MonitoringTableResource,
    patch: Partial<MonitoringTableState>,
  ) => {
    setTableStates((current) => ({
      ...current,
      [resource]: {
        ...current[resource],
        ...patch,
      },
    }))
  }

  const handleTableChange = (pagination: TablePaginationConfig) => {
    const nextPageSize = pagination.pageSize ?? activeTableState.pageSize
    const nextPageNum =
      nextPageSize !== activeTableState.pageSize
        ? 1
        : (pagination.current ?? activeTableState.pageNum)

    updateTableState(activeResource, {
      pageNum: nextPageNum,
      pageSize: nextPageSize,
    })
  }

  const handleTaskSubmit = (values: TaskFilterValues) => {
    updateTableState('TASK_STAT', {
      pageNum: 1,
      filters: compactFilters({
        taskType: trimToUndefined(values.taskType),
      }),
    })
  }

  const handleExceptionSubmit = (values: ExceptionFilterValues) => {
    updateTableState('EXCEPTION_LOG', {
      pageNum: 1,
      filters: compactFilters({
        exceptionType: trimToUndefined(values.exceptionType),
        resultCode: parseOptionalNumber(values.resultCode),
        requestPath: trimToUndefined(values.requestPath),
      }),
    })
  }

  const handleLlmSubmit = (values: LlmFilterValues) => {
    updateTableState('LLM_CALL_LOG', {
      pageNum: 1,
      filters: compactFilters({
        scenario: trimToUndefined(values.scenario),
        modelName: trimToUndefined(values.modelName),
        status: trimToUndefined(values.status),
        appId: parseOptionalNumber(values.appId),
        taskId: parseOptionalNumber(values.taskId),
      }),
    })
  }

  const resetTaskFilters = () => {
    setTaskFilterValues({})
    updateTableState('TASK_STAT', {
      pageNum: 1,
      filters: undefined,
    })
  }

  const resetExceptionFilters = () => {
    setExceptionFilterValues({})
    updateTableState('EXCEPTION_LOG', {
      pageNum: 1,
      filters: undefined,
    })
  }

  const resetLlmFilters = () => {
    setLlmFilterValues({})
    updateTableState('LLM_CALL_LOG', {
      pageNum: 1,
      filters: undefined,
    })
  }

  const renderFilterActions = (onReset: () => void) => (
    <div>
      <Text className="mb-2 block text-sm text-slate-700">操作</Text>
      <Space wrap>
        <Button
          type="primary"
          htmlType="submit"
          icon={<Search className="size-4" />}
          className="h-10 rounded-lg"
        >
          查询
        </Button>
        <Button
          icon={<RotateCcw className="size-4" />}
          onClick={onReset}
          className="h-10 rounded-lg"
        >
          重置
        </Button>
      </Space>
    </div>
  )

  const renderTaskFilters = () => (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        handleTaskSubmit(taskFilterValues)
      }}
      className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto]"
    >
      <div>
        <label
          htmlFor="monitoring-task-type"
          className="mb-2 block text-sm text-slate-700"
        >
          任务类型
        </label>
        <Select
          id="monitoring-task-type"
          allowClear
          options={TASK_TYPE_OPTIONS}
          placeholder="全部类型"
          value={taskFilterValues.taskType}
          onChange={(value) =>
            setTaskFilterValues((current) => ({
              ...current,
              taskType: value,
            }))
          }
          className="h-10"
        />
      </div>
      {renderFilterActions(resetTaskFilters)}
    </form>
  )

  const renderExceptionFilters = () => (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        handleExceptionSubmit(exceptionFilterValues)
      }}
      className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <div>
        <label
          htmlFor="monitoring-exception-type"
          className="mb-2 block text-sm text-slate-700"
        >
          异常类型
        </label>
        <Input
          id="monitoring-exception-type"
          allowClear
          placeholder="按异常类型搜索"
          value={exceptionFilterValues.exceptionType}
          onChange={(event) =>
            setExceptionFilterValues((current) => ({
              ...current,
              exceptionType: event.target.value,
            }))
          }
          className="h-10"
        />
      </div>
      <div>
        <label
          htmlFor="monitoring-result-code"
          className="mb-2 block text-sm text-slate-700"
        >
          结果码
        </label>
        <Input
          id="monitoring-result-code"
          allowClear
          type="number"
          placeholder="如 50000"
          value={exceptionFilterValues.resultCode}
          onChange={(event) =>
            setExceptionFilterValues((current) => ({
              ...current,
              resultCode: event.target.value,
            }))
          }
          className="h-10"
        />
      </div>
      <div>
        <label
          htmlFor="monitoring-request-path"
          className="mb-2 block text-sm text-slate-700"
        >
          请求路径
        </label>
        <Input
          id="monitoring-request-path"
          allowClear
          placeholder="按接口路径搜索"
          value={exceptionFilterValues.requestPath}
          onChange={(event) =>
            setExceptionFilterValues((current) => ({
              ...current,
              requestPath: event.target.value,
            }))
          }
          className="h-10"
        />
      </div>
      {renderFilterActions(resetExceptionFilters)}
    </form>
  )

  const renderLlmFilters = () => (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        handleLlmSubmit(llmFilterValues)
      }}
      className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6"
    >
      <div>
        <label
          htmlFor="monitoring-llm-scenario"
          className="mb-2 block text-sm text-slate-700"
        >
          调用场景
        </label>
        <Input
          id="monitoring-llm-scenario"
          allowClear
          placeholder="如 CODE_GENERATE"
          value={llmFilterValues.scenario}
          onChange={(event) =>
            setLlmFilterValues((current) => ({
              ...current,
              scenario: event.target.value,
            }))
          }
          className="h-10"
        />
      </div>
      <div>
        <label
          htmlFor="monitoring-llm-model"
          className="mb-2 block text-sm text-slate-700"
        >
          模型
        </label>
        <Input
          id="monitoring-llm-model"
          allowClear
          placeholder="模型名称"
          value={llmFilterValues.modelName}
          onChange={(event) =>
            setLlmFilterValues((current) => ({
              ...current,
              modelName: event.target.value,
            }))
          }
          className="h-10"
        />
      </div>
      <div>
        <label
          htmlFor="monitoring-llm-status"
          className="mb-2 block text-sm text-slate-700"
        >
          状态
        </label>
        <Select
          id="monitoring-llm-status"
          allowClear
          options={LLM_STATUS_OPTIONS}
          placeholder="全部状态"
          value={llmFilterValues.status}
          onChange={(value) =>
            setLlmFilterValues((current) => ({
              ...current,
              status: value,
            }))
          }
          className="h-10"
        />
      </div>
      <div>
        <label
          htmlFor="monitoring-llm-app-id"
          className="mb-2 block text-sm text-slate-700"
        >
          应用 ID
        </label>
        <Input
          id="monitoring-llm-app-id"
          allowClear
          type="number"
          placeholder="应用 ID"
          value={llmFilterValues.appId}
          onChange={(event) =>
            setLlmFilterValues((current) => ({
              ...current,
              appId: event.target.value,
            }))
          }
          className="h-10"
        />
      </div>
      <div>
        <label
          htmlFor="monitoring-llm-task-id"
          className="mb-2 block text-sm text-slate-700"
        >
          任务 ID
        </label>
        <Input
          id="monitoring-llm-task-id"
          allowClear
          type="number"
          placeholder="任务 ID"
          value={llmFilterValues.taskId}
          onChange={(event) =>
            setLlmFilterValues((current) => ({
              ...current,
              taskId: event.target.value,
            }))
          }
          className="h-10"
        />
      </div>
      {renderFilterActions(resetLlmFilters)}
    </form>
  )

  const taskColumns: TableColumnsType<TaskMonitoringStat> = [
    {
      title: '任务类型',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 140,
      render: (value: string) => <Tag color="blue">{value || '-'}</Tag>,
    },
    {
      title: '总数',
      dataIndex: 'total',
      key: 'total',
      width: 110,
      align: 'right',
      render: (value: number) => formatMetricValue(value, 'count'),
    },
    {
      title: '待执行',
      dataIndex: 'pending',
      key: 'pending',
      width: 110,
      align: 'right',
      render: (value: number) => formatMetricValue(value, 'count'),
    },
    {
      title: '运行中',
      dataIndex: 'running',
      key: 'running',
      width: 110,
      align: 'right',
      render: (value: number) => formatMetricValue(value, 'count'),
    },
    {
      title: '成功',
      dataIndex: 'success',
      key: 'success',
      width: 110,
      align: 'right',
      render: (value: number) => formatMetricValue(value, 'count'),
    },
    {
      title: '失败',
      dataIndex: 'failed',
      key: 'failed',
      width: 110,
      align: 'right',
      render: (value: number) => formatMetricValue(value, 'count'),
    },
    {
      title: '取消',
      dataIndex: 'canceled',
      key: 'canceled',
      width: 110,
      align: 'right',
      render: (value: number) => formatMetricValue(value, 'count'),
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 120,
      align: 'right',
      render: (value: number) => formatMetricValue(value, 'ratio'),
    },
    {
      title: '失败率',
      dataIndex: 'failedRate',
      key: 'failedRate',
      width: 120,
      align: 'right',
      render: (value: number) => formatMetricValue(value, 'ratio'),
    },
    {
      title: '平均耗时',
      dataIndex: 'averageDurationMillis',
      key: 'averageDurationMillis',
      width: 140,
      align: 'right',
      render: (value: number) => formatMetricValue(value, 'ms'),
    },
  ]

  const exceptionColumns: TableColumnsType<SystemExceptionLogInfo> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
    },
    {
      title: '发生时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '异常类型',
      dataIndex: 'exceptionType',
      key: 'exceptionType',
      width: 220,
      ellipsis: true,
      render: (value: string) => displayText(value),
    },
    {
      title: '结果码',
      dataIndex: 'resultCode',
      key: 'resultCode',
      width: 110,
      align: 'center',
      render: (value: number) => <Tag color="red">{displayText(value)}</Tag>,
    },
    {
      title: '方法',
      dataIndex: 'requestMethod',
      key: 'requestMethod',
      width: 100,
      align: 'center',
      render: (value: string) => <Tag color={getMethodTagColor(value)}>{displayText(value)}</Tag>,
    },
    {
      title: '请求路径',
      dataIndex: 'requestPath',
      key: 'requestPath',
      width: 260,
      ellipsis: true,
      render: (value: string) => displayText(value),
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      width: 360,
      ellipsis: true,
      render: (value: string) => displayText(value),
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      fixed: 'right',
      render: (_value, record) => (
        <Button
          type="link"
          icon={<Eye className="size-4" />}
          onClick={() => setSelectedException(record)}
          className="px-0!"
        >
          详情
        </Button>
      ),
    },
  ]

  const llmColumns: TableColumnsType<LlmCallLogInfo> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
    },
    {
      title: '调用时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '场景',
      dataIndex: 'scenario',
      key: 'scenario',
      width: 180,
      ellipsis: true,
      render: (value: string) => displayText(value),
    },
    {
      title: '模型',
      dataIndex: 'modelName',
      key: 'modelName',
      width: 180,
      ellipsis: true,
      render: (value: string) => displayText(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (value: string) => getLlmStatusTag(value),
    },
    {
      title: '应用 ID',
      dataIndex: 'appId',
      key: 'appId',
      width: 110,
      render: (value: number | null) => displayText(value),
    },
    {
      title: '任务 ID',
      dataIndex: 'taskId',
      key: 'taskId',
      width: 110,
      render: (value: number | null) => displayText(value),
    },
    {
      title: 'Prompt Tokens',
      dataIndex: 'promptTokens',
      key: 'promptTokens',
      width: 150,
      align: 'right',
      render: (value: number | null) => formatNumber(value, 0),
    },
    {
      title: 'Completion Tokens',
      dataIndex: 'completionTokens',
      key: 'completionTokens',
      width: 180,
      align: 'right',
      render: (value: number | null) => formatNumber(value, 0),
    },
    {
      title: '总 Tokens',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      width: 130,
      align: 'right',
      render: (value: number | null) => formatNumber(value, 0),
    },
    {
      title: '耗时',
      dataIndex: 'durationMillis',
      key: 'durationMillis',
      width: 120,
      align: 'right',
      render: (value: number | null) => formatMetricValue(value, 'ms'),
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      width: 260,
      ellipsis: true,
      render: (value: string | null) => displayText(value),
    },
  ]

  const renderTable = () => {
    const pagination = {
      current: activeTable?.pageNum ?? activeTableState.pageNum,
      pageSize: activeTable?.pageSize ?? activeTableState.pageSize,
      total,
      showSizeChanger: true,
      showTotal: (totalCount: number, rangeItems: [number, number]) =>
        `第 ${rangeItems[0]}-${rangeItems[1]} 条，共 ${totalCount} 条`,
    }

    if (activeResource === 'TASK_STAT') {
      return (
        <Table
          key="task-stat-table"
          rowKey={(record) => record.taskType || 'UNKNOWN'}
          columns={taskColumns}
          dataSource={(activeTable?.records ?? []) as TaskMonitoringStat[]}
          loading={tableQuery.isFetching}
          tableLayout="fixed"
          pagination={pagination}
          scroll={{ x: 1180 }}
          onChange={handleTableChange}
        />
      )
    }

    if (activeResource === 'EXCEPTION_LOG') {
      return (
        <Table
          key="exception-log-table"
          rowKey={(record) => String(record.id ?? record.createdAt ?? record.exceptionType)}
          columns={exceptionColumns}
          dataSource={(activeTable?.records ?? []) as SystemExceptionLogInfo[]}
          loading={tableQuery.isFetching}
          tableLayout="fixed"
          pagination={pagination}
          scroll={{ x: 1420 }}
          onChange={handleTableChange}
        />
      )
    }

    return (
      <Table
        key="llm-call-log-table"
        rowKey={(record) => String(record.id ?? record.createdAt ?? record.modelName)}
        columns={llmColumns}
        dataSource={(activeTable?.records ?? []) as LlmCallLogInfo[]}
        loading={tableQuery.isFetching}
        tableLayout="fixed"
        pagination={pagination}
        scroll={{ x: 1700 }}
        onChange={handleTableChange}
      />
    )
  }

  const renderFilters = () => {
    if (activeResource === 'TASK_STAT') {
      return renderTaskFilters()
    }

    if (activeResource === 'EXCEPTION_LOG') {
      return renderExceptionFilters()
    }

    return renderLlmFilters()
  }

  return (
    <>
      <Card
        className="rounded-lg border-stone-200/70 bg-[#fffefd] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        classNames={{
          body: 'p-5!',
        }}
      >
        <div className="mb-4 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-slate-500" />
            <Text className="text-[15px] font-semibold text-slate-900">明细表格</Text>
          </div>
        </div>

        <Tabs
          activeKey={activeResource}
          items={tabItems}
          onChange={(key) => setActiveResource(key as MonitoringTableResource)}
          className="mb-4"
        />

        {renderFilters()}

        {tableQuery.isError ? (
          <Alert
            showIcon
            type="error"
            className="mb-5"
            title={getErrorMessage(tableQuery.error)}
          />
        ) : null}

        {activeTable?.status === 'UNAVAILABLE' ? (
          <Alert
            showIcon
            type="warning"
            className="mb-5"
            title={activeTable.errorMessage || `${MONITORING_TABLE_LABELS[activeResource]}暂不可用`}
          />
        ) : null}

        {renderTable()}
      </Card>

      <Drawer
        open={Boolean(selectedException)}
        title="异常详情"
        width="min(560px, calc(100vw - 32px))"
        destroyOnHidden
        classNames={{
          wrapper: 'max-w-[calc(100vw-32px)]!',
          body: 'overflow-x-hidden! px-5! py-4!',
        }}
        onClose={() => setSelectedException(undefined)}
      >
        <div className="flex min-w-0 max-w-full flex-col gap-5 overflow-x-hidden">
          <ExceptionDetailSection title="基础信息">
            <div className="grid min-w-0 max-w-full gap-4">
              <ExceptionDetailField
                label="异常类型"
                valueClassName="whitespace-pre-wrap break-all font-mono text-sm leading-6 text-slate-900"
              >
                {displayText(selectedException?.exceptionType)}
              </ExceptionDetailField>

              <ExceptionDetailField label="发生时间">
                {formatDateTime(selectedException?.createdAt)}
              </ExceptionDetailField>

              <ExceptionDetailField label="用户 ID">
                {displayText(selectedException?.userId)}
              </ExceptionDetailField>

              <ExceptionDetailField label="错误码">
                <Tag
                  color="red"
                  className="m-0!"
                >
                  {displayText(selectedException?.resultCode)}
                </Tag>
              </ExceptionDetailField>
            </div>
          </ExceptionDetailSection>

          <ExceptionDetailSection title="请求信息">
            <div className="grid min-w-0 max-w-full gap-4">
              <ExceptionDetailField label="请求方法">
                <Tag
                  color={getMethodTagColor(selectedException?.requestMethod)}
                  className="m-0!"
                >
                  {displayText(selectedException?.requestMethod)}
                </Tag>
              </ExceptionDetailField>

              <ExceptionDetailField
                label="请求路径"
                valueClassName="whitespace-pre-wrap break-all font-mono text-sm leading-6 text-slate-900"
              >
                {displayText(selectedException?.requestPath)}
              </ExceptionDetailField>
            </div>
          </ExceptionDetailSection>

          <ExceptionDetailSection title="错误信息">
            <div className="min-w-0 max-w-full rounded-lg border border-rose-100 bg-rose-50/70 p-3">
              <p className="m-0 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900 [overflow-wrap:anywhere]">
                {displayText(selectedException?.errorMessage)}
              </p>
            </div>
          </ExceptionDetailSection>

          <ExceptionDetailSection title="Stack Trace">
            <div className="max-h-96 min-w-0 max-w-full overflow-y-auto overflow-x-hidden rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
              <code className="block whitespace-pre-wrap break-all font-mono [overflow-wrap:anywhere]">
                {selectedException?.stackTrace || '-'}
              </code>
            </div>
          </ExceptionDetailSection>
        </div>
      </Drawer>
    </>
  )
}
