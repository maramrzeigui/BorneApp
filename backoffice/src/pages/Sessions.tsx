import { useMemo, useState } from 'react'
import { Badge, Card, Select, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { fetchBornes, fetchSessions } from '../api'
import {
  ETAT_SESSION_COLORS,
  ETAT_SESSION_LABELS,
  formatDate,
  formatDuree,
  formatEnergie,
  formatMontant,
} from '../format'
import type { EtatSession, Session } from '../types'

export default function SessionsPage() {
  const [filtreEtat, setFiltreEtat] = useState<EtatSession | undefined>(undefined)
  const [filtreBorne, setFiltreBorne] = useState<number | undefined>(undefined)

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  })
  const { data: bornes } = useQuery({ queryKey: ['bornes'], queryFn: fetchBornes })

  const donnees = useMemo(
    () =>
      (sessions ?? []).filter(
        (s) =>
          (!filtreEtat || s.etat === filtreEtat) && (!filtreBorne || s.borneId === filtreBorne),
      ),
    [sessions, filtreEtat, filtreBorne],
  )

  const colonnes: ColumnsType<Session> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: 'Borne', dataIndex: 'borneNom' },
    { title: 'Utilisateur', dataIndex: 'userNom' },
    { title: 'Connecteur', dataIndex: 'typeConnecteur' },
    {
      title: 'Début',
      dataIndex: 'dateDebut',
      render: formatDate,
      sorter: (a, b) => dayjs(a.dateDebut).valueOf() - dayjs(b.dateDebut).valueOf(),
      defaultSortOrder: 'descend',
    },
    { title: 'Fin', dataIndex: 'dateFin', render: formatDate },
    {
      title: 'Durée',
      dataIndex: 'dureeMinutes',
      render: formatDuree,
      sorter: (a, b) => a.dureeMinutes - b.dureeMinutes,
    },
    {
      title: 'Énergie',
      dataIndex: 'energieKwh',
      render: formatEnergie,
      sorter: (a, b) => a.energieKwh - b.energieKwh,
    },
    {
      title: 'Prix',
      dataIndex: 'prix',
      render: formatMontant,
      sorter: (a, b) => a.prix - b.prix,
    },
    {
      title: 'État',
      dataIndex: 'etat',
      render: (etat: EtatSession) => (
        <Badge
          status={
            (ETAT_SESSION_COLORS[etat] ?? 'default') as
              | 'processing'
              | 'warning'
              | 'success'
              | 'error'
              | 'default'
          }
          text={ETAT_SESSION_LABELS[etat] ?? etat}
        />
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Sessions de charge
      </Typography.Title>
      <Card size="small">
        <Space style={{ marginBottom: 16 }} wrap>
          <Select<EtatSession>
            placeholder="Filtrer par état"
            allowClear
            style={{ width: 180 }}
            value={filtreEtat}
            onChange={setFiltreEtat}
            options={(Object.keys(ETAT_SESSION_LABELS) as EtatSession[]).map((etat) => ({
              value: etat,
              label: ETAT_SESSION_LABELS[etat],
            }))}
          />
          <Select<number>
            placeholder="Filtrer par borne"
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 240 }}
            value={filtreBorne}
            onChange={setFiltreBorne}
            options={(bornes ?? []).map((b) => ({ value: b.id, label: b.nom }))}
          />
        </Space>
        <Table<Session>
          rowKey="id"
          columns={colonnes}
          dataSource={donnees}
          loading={isLoading}
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 15, showSizeChanger: true }}
        />
      </Card>
    </div>
  )
}
