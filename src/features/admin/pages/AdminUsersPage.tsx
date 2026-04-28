import { useListUsers } from '@/api/generated/endpoints/admin-user'
import type { ListUsersRequest, ListUsersRequestSortOrder, UserInfo } from '@/api/generated/models'
import type { ListUsersParams, PageResultUserInfo } from '@/api/generated/models'
import { keepPreviousData } from '@tanstack/react-query'
import {
  Alert,
  Avatar,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import type { Dayjs } from 'dayjs'
import { RotateCcw, Search } from 'lucide-react'
import { useState } from 'react'

const { Paragraph, Title } = Typography
const { RangePicker } = DatePicker

const DEFAULT_ADMIN_USERS_SEARCH: ListUsersRequest = {
  pageNum: 1,
  pageSize: 10,
  sortField: 'createTime',
  sortOrder: 'DESC',
}

interface AdminUsersFilterValues {
  account?: string
  createTimeRange?: [Dayjs, Dayjs]
}

export function AdminUsersPage() {
  const [form] = Form.useForm<AdminUsersFilterValues>()
  const [search, setSearch] = useState<ListUsersRequest>(DEFAULT_ADMIN_USERS_SEARCH)
  // 仅当用户实际点过排序时，表头才显示“已排序”高亮；默认倒序只体现在请求参数里。
  const [sortTouched, setSortTouched] = useState(false)
  const queryKeyPayload: ListUsersParams = {
    request: search,
  }
  const usersQuery = useListUsers<PageResultUserInfo | undefined, { message: string }>(
    queryKeyPayload,
    {
      request: {
        params: search,
      },
      query: {
        placeholderData: keepPreviousData,
        retry: false,
        select: (response) => response.data,
      },
    },
  )
  const pageResult = usersQuery.data
  const total = Number(pageResult?.total ?? 0)

  const handleSubmit = (values: AdminUsersFilterValues) => {
    const [start, end] = values.createTimeRange ?? []

    setSearch((currentSearch) => ({
      ...currentSearch,
      pageNum: 1,
      account: values.account?.trim() || undefined,
      createTimeStart: start ? start.format('YYYY-MM-DDTHH:mm:ss') : undefined,
      createTimeEnd: end ? end.format('YYYY-MM-DDTHH:mm:ss') : undefined,
    }))
  }

  const handleReset = () => {
    form.resetFields()
    setSearch(DEFAULT_ADMIN_USERS_SEARCH)
    setSortTouched(false)
  }

  const handleTableChange: TableProps<UserInfo>['onChange'] = (
    pagination,
    _filters,
    sorter,
    extra,
  ) => {
    const currentSorter = sorter as { order?: 'ascend' | 'descend' }
    const nextPageSize = pagination.pageSize ?? search.pageSize
    const nextPageNum =
      nextPageSize !== search.pageSize ? 1 : (pagination.current ?? pageResult?.pageNum ?? 1)

    if (extra.action === 'sort') {
      setSortTouched(Boolean(currentSorter?.order))
    }

    setSearch((currentSearch) => ({
      ...currentSearch,
      pageNum: nextPageNum,
      pageSize: nextPageSize,
      sortField: 'createTime',
      sortOrder:
        currentSorter?.order === 'ascend'
          ? ('ASC' as ListUsersRequestSortOrder)
          : ('DESC' as ListUsersRequestSortOrder),
    }))
  }

  const columns: TableColumnsType<UserInfo> = [
    {
      title: '用户 ID',
      dataIndex: 'id',
      key: 'id',
      width: 110,
    },
    {
      title: '账号',
      dataIndex: 'account',
      key: 'account',
      width: 160,
      ellipsis: true,
    },
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 88,
      render: (_value: string, record) => {
        const displayInitial = record.nickname?.trim().slice(0, 1).toUpperCase()

        return (
          <Avatar
            size={36}
            src={record.avatar}
            className="bg-slate-900!"
          >
            {displayInitial}
          </Avatar>
        )
      },
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 180,
      ellipsis: true,
      render: (value: string) => value || '未设置',
    },
    {
      title: '角色',
      dataIndex: 'roleText',
      key: 'roleText',
      width: 120,
      align: 'center',
      render: (value: string, record) => {
        const isAdmin = record.role === 1

        return <Tag color={isAdmin ? 'blue' : 'default'}>{value || 'user'}</Tag>
      },
    },
    {
      title: '个人简介',
      dataIndex: 'profile',
      key: 'profile',
      width: 360,
      ellipsis: true,
      render: (value: string) => value || '未设置',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 220,
      sorter: true,
      sortDirections: ['descend', 'ascend'],
      sortOrder: sortTouched ? (search.sortOrder === 'ASC' ? 'ascend' : 'descend') : undefined,
      onHeaderCell: () => ({
        className: 'cursor-pointer select-none',
      }),
      render: (value: string) => value || '-',
    },
  ]

  return (
    <Card className="rounded-3xl border-stone-200/55 bg-[#fffefd] shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <div className="mb-6">
        <Title
          level={3}
          className="mb-2!"
        >
          用户管理
        </Title>
        <Paragraph className="mb-0! text-slate-500">按条件筛选并查看用户列表。</Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        colon={false}
        requiredMark={false}
        initialValues={{
          account: '',
          createTimeRange: undefined,
        }}
        onFinish={handleSubmit}
        className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
      >
        <Form.Item
          name="account"
          label="账号"
          className="mb-0!"
        >
          <Input
            allowClear
            placeholder="按账号模糊搜索"
            className="h-11"
          />
        </Form.Item>

        <Form.Item
          name="createTimeRange"
          label="创建时间"
          className="mb-0!"
        >
          <RangePicker
            showTime
            allowEmpty={[true, true]}
            inputReadOnly
            className="h-11 w-full"
          />
        </Form.Item>

        <Form.Item className="mb-0! flex items-end">
          <Space wrap>
            <Button
              type="primary"
              htmlType="submit"
              icon={<Search className="size-4" />}
              className="h-11 rounded-xl"
            >
              查询
            </Button>
            <Button
              icon={<RotateCcw className="size-4" />}
              onClick={handleReset}
              className="h-11 rounded-xl"
            >
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {usersQuery.isError ? (
        <Alert
          showIcon
          type="error"
          className="mb-5"
          message={usersQuery.error.message}
        />
      ) : null}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={pageResult?.list ?? []}
        loading={usersQuery.isFetching}
        tableLayout="fixed"
        showSorterTooltip={false}
        pagination={{
          current: pageResult?.pageNum ?? search.pageNum,
          pageSize: pageResult?.pageSize ?? search.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
        }}
        scroll={{ x: 1240 }}
        onChange={handleTableChange}
      />
    </Card>
  )
}
