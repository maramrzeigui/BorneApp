import { Card, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { fetchAudit } from '../api'
import { formatDate } from '../format'
import type { AuditEntry } from '../types'

export default function AuditPage() {
  const { data: entrees, isLoading } = useQuery({ queryKey: ['audit'], queryFn: fetchAudit })

  const colonnes: ColumnsType<AuditEntry> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: 'Utilisateur', dataIndex: 'userNom' },
    { title: 'Action', dataIndex: 'action' },
    { title: 'Cible', dataIndex: 'cible' },
    { title: 'Détails', dataIndex: 'details', ellipsis: true },
    { title: 'IP', dataIndex: 'ip', width: 130 },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: formatDate,
      sorter: (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
      defaultSortOrder: 'descend',
      width: 160,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Journal d'audit
      </Typography.Title>
      <Card size="small">
        <Table<AuditEntry>
          rowKey="id"
          columns={colonnes}
          dataSource={entrees ?? []}
          loading={isLoading}
          size="middle"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>
    </div>
  )
}
