import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'

import {
  DEFAULT_USER_TABLE_SORT_ORDER,
  buildUserListRequest,
  formatUserDateTime,
  getUserDisplayInitial,
} from './AdminUsersPage'

describe('AdminUsersPage helpers', () => {
  it('builds a trimmed user list request with date range and default sort', () => {
    const request = buildUserListRequest({
      pageNum: 2,
      pageSize: 20,
      account: '  alice  ',
      createTimeRange: [dayjs('2026-05-01 00:00:00'), dayjs('2026-05-19 23:59:59')],
      sortOrder: 'descend',
    })

    expect(request).toEqual({
      pageNum: 2,
      pageSize: 20,
      account: 'alice',
      createTimeStart: '2026-05-01T00:00:00',
      createTimeEnd: '2026-05-19T23:59:59',
      sortField: 'createTime',
      sortOrder: 'DESC',
    })
  })

  it('omits empty filters and maps ascending sort', () => {
    const request = buildUserListRequest({
      pageNum: 1,
      pageSize: 10,
      account: '   ',
      createTimeRange: [dayjs('2026-05-01 00:00:00'), null],
      sortOrder: 'ascend',
    })

    expect(request).toEqual({
      pageNum: 1,
      pageSize: 10,
      sortField: 'createTime',
      sortOrder: 'ASC',
    })
  })

  it('keeps the table sorter unselected while defaulting requests to descending order', () => {
    const request = buildUserListRequest({
      pageNum: 1,
      pageSize: 10,
      account: '',
      createTimeRange: null,
      sortOrder: DEFAULT_USER_TABLE_SORT_ORDER,
    })

    expect(DEFAULT_USER_TABLE_SORT_ORDER).toBeNull()
    expect(request.sortOrder).toBe('DESC')
  })

  it('formats user date time and falls back to original invalid value', () => {
    expect(formatUserDateTime('2026-05-19T10:30:00')).toBe('2026-05-19 10:30:00')
    expect(formatUserDateTime('not-a-date')).toBe('not-a-date')
    expect(formatUserDateTime()).toBe('-')
  })

  it('uses nickname, account, then id for avatar initial', () => {
    expect(getUserDisplayInitial({ nickname: ' 张三 ', account: 'zhangsan', id: '1' })).toBe('张')
    expect(getUserDisplayInitial({ account: 'alice', id: '1' })).toBe('A')
    expect(getUserDisplayInitial({ id: 'user-1' })).toBe('U')
    expect(getUserDisplayInitial({})).toBe('?')
  })
})
