import { App as AntApp, Button, Card, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { errorMessage, fetchAlertes, resoudreAlerte } from '../api'
import { GRAVITE_COLORS, GRAVITE_LABELS, formatDate } from '../format'
import type { Alerte, GraviteAlerte } from '../types'

export default function AlertesPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  const { data: alertes, isLoading } = useQuery({
    queryKey: ['alertes'],
    queryFn: fetchAlertes,
    refetchInterval: 30_000,
  })

  const resolution = useMutation({
    mutationFn: resoudreAlerte,
    onSuccess: () => {
      message.success('Alerte résolue')
      queryClient.invalidateQueries({ queryKey: ['alertes'] })
    },
    onError: (error) => message.error(errorMessage(error, 'Échec de la résolution')),
  })

  const colonnes: ColumnsType<Alerte> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: 'Borne', dataIndex: 'borneNom' },
    { title: 'Type', dataIndex: 'type', render: (t: string) => <Tag>{t}</Tag> },
    {
      title: 'Gravité',
      dataIndex: 'gravite',
      render: (g: GraviteAlerte) => (
        <Tag color={GRAVITE_COLORS[g] ?? 'default'}>{GRAVITE_LABELS[g] ?? g}</Tag>
      ),
      filters: (Object.keys(GRAVITE_LABELS) as GraviteAlerte[]).map((g) => ({
        text: GRAVITE_LABELS[g],
        value: g,
      })),
      onFilter: (value, a) => a.gravite === value,
    },
    { title: 'Message', dataIndex: 'message', ellipsis: true },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: formatDate,
      sorter: (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Statut',
      dataIndex: 'resolue',
      render: (resolue: boolean) =>
        resolue ? <Tag color="green">Résolue</Tag> : <Tag color="red">Non résolue</Tag>,
      filters: [
        { text: 'Non résolues', value: false },
        { text: 'Résolues', value: true },
      ],
      onFilter: (value, a) => a.resolue === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, alerte) =>
        !alerte.resolue ? (
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            loading={resolution.isPending && resolution.variables === alerte.id}
            onClick={() => resolution.mutate(alerte.id)}
          >
            Résoudre
          </Button>
        ) : null,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Alertes
      </Typography.Title>
      <Card size="small">
        <Table<Alerte>
          rowKey="id"
          columns={colonnes}
          dataSource={alertes ?? []}
          loading={isLoading}
          size="middle"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 15, showSizeChanger: true }}
        />
      </Card>
    </div>
  )
}
