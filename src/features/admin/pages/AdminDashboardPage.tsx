import { Card, Flex, Skeleton } from 'antd'

export function AdminDashboardPage() {
  return (
    <Card className="rounded-2xl border-stone-200/55 bg-[#fffefd] shadow-[0_10px_28px_rgba(15,23,42,0.06)] [&_.ant-card-body]:p-0">
      <Flex
        vertical
        align="center"
        justify="center"
        className="min-h-[calc(100vh-200px)] px-6 py-8"
      >
        <div className="w-full max-w-120">
          <Skeleton
            active
            round
            title={{ width: '38%' }}
            paragraph={{ rows: 6, width: ['100%', '92%', '96%', '88%', '94%', '80%'] }}
          />
        </div>
      </Flex>
    </Card>
  )
}
