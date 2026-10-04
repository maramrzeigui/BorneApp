import { useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, RightOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import {
  createMaintenance,
  errorMessage,
  fetchBornes,
  fetchMaintenances,
  fetchUsers,
  updateMaintenanceStatut,
} from '../api'
import {
  STATUT_MAINTENANCE_COLORS,
  STATUT_MAINTENANCE_LABELS,
  formatDate,
} from '../format'
import type { Maintenance, StatutMaintenance } from '../types'

const STATUT_SUIVANT: Partial<Record<StatutMaintenance, StatutMaintenance>> = {
  planifiee: 'en_cours',
  en_cours: 'terminee',
}

interface FormValues {
  borneId: number
  description: string
  datePrevue: Dayjs
  technicienId?: number
}

export default function MaintenancesPage() {
  const { message, modal } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [modalOuverte, setModalOuverte] = useState(false)
  const [form] = Form.useForm<FormValues>()

  const { data: maintenances, isLoading } = useQuery({
    queryKey: ['maintenances'],
    queryFn: fetchMaintenances,
  })
  const { data: bornes } = useQuery({ queryKey: ['bornes'], queryFn: fetchBornes })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const techniciens = (users ?? []).filter((u) => u.role === 'technicien')

  const creation = useMutation({
    mutationFn: (values: FormValues) =>
      createMaintenance({
        borneId: values.borneId,
        description: values.description,
        datePrevue: values.datePrevue.format('YYYY-MM-DD HH:mm:ss'),
        technicienId: values.technicienId,
      }),
    onSuccess: () => {
      message.success('Ordre de maintenance créé')
      setModalOuverte(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
    },
    onError: (error) => message.error(errorMessage(error, 'Échec de la création')),
  })

  const avancement = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: StatutMaintenance }) =>
      updateMaintenanceStatut(id, statut),
    onSuccess: () => {
      message.success('Statut mis à jour')
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
    },
    onError: (error) => message.error(errorMessage(error, 'Échec de la mise à jour')),
  })

  const avancer = (m: Maintenance) => {
    const suivant = STATUT_SUIVANT[m.statut]
    if (!suivant) return
    modal.confirm({
      title: 'Faire avancer le statut ?',
      content: `« ${STATUT_MAINTENANCE_LABELS[m.statut]} » → « ${STATUT_MAINTENANCE_LABELS[suivant]} »`,
      okText: 'Confirmer',
      cancelText: 'Annuler',
      onOk: () => avancement.mutateAsync({ id: m.id, statut: suivant }),
    })
  }

  const colonnes: ColumnsType<Maintenance> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: 'Borne', dataIndex: 'borneNom' },
    {
      title: 'Technicien',
      dataIndex: 'technicienNom',
      render: (t: string | null) => t || '—',
    },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    {
      title: 'Date prévue',
      dataIndex: 'datePrevue',
      render: formatDate,
      sorter: (a, b) => dayjs(a.datePrevue).valueOf() - dayjs(b.datePrevue).valueOf(),
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      render: (statut: StatutMaintenance) => (
        <Tag color={STATUT_MAINTENANCE_COLORS[statut] ?? 'default'}>
          {STATUT_MAINTENANCE_LABELS[statut] ?? statut}
        </Tag>
      ),
      filters: (Object.keys(STATUT_MAINTENANCE_LABELS) as StatutMaintenance[]).map((s) => ({
        text: STATUT_MAINTENANCE_LABELS[s],
        value: s,
      })),
      onFilter: (value, m) => m.statut === value,
    },
    { title: 'Créé le', dataIndex: 'createdAt', render: formatDate },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, m) =>
        STATUT_SUIVANT[m.statut] ? (
          <Button size="small" icon={<RightOutlined />} onClick={() => avancer(m)}>
            {STATUT_MAINTENANCE_LABELS[STATUT_SUIVANT[m.statut]!]}
          </Button>
        ) : null,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Maintenance
      </Typography.Title>
      <Card size="small">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ marginBottom: 16 }}
          onClick={() => setModalOuverte(true)}
        >
          Nouvel ordre de maintenance
        </Button>
        <Table<Maintenance>
          rowKey="id"
          columns={colonnes}
          dataSource={maintenances ?? []}
          loading={isLoading}
          size="middle"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title="Nouvel ordre de maintenance"
        open={modalOuverte}
        onCancel={() => setModalOuverte(false)}
        onOk={() => form.submit()}
        okText="Créer"
        cancelText="Annuler"
        confirmLoading={creation.isPending}
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => creation.mutate(values)}
        >
          <Form.Item
            name="borneId"
            label="Borne"
            rules={[{ required: true, message: 'Borne requise' }]}
          >
            <Select
              placeholder="Sélectionner une borne"
              showSearch
              optionFilterProp="label"
              options={(bornes ?? []).map((b) => ({ value: b.id, label: b.nom }))}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Description requise' }]}
          >
            <Input.TextArea rows={3} placeholder="Description de l'intervention..." />
          </Form.Item>
          <Form.Item
            name="datePrevue"
            label="Date prévue"
            rules={[{ required: true, message: 'Date requise' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="technicienId" label="Technicien (optionnel)">
            <Select
              placeholder="Assigner un technicien"
              allowClear
              options={techniciens.map((t) => ({
                value: t.id,
                label: `${t.prenom} ${t.nom}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
