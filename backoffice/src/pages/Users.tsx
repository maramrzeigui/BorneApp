import { useMemo, useState } from 'react'
import { App as AntApp, Card, Input, Select, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { errorMessage, fetchUsers, updateUserRole } from '../api'
import { ROLE_LABELS, ROLES_PERSONNEL, formatDate, formatMontant } from '../format'
import type { Role, User } from '../types'

export default function UsersPage() {
  const { message, modal } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [recherche, setRecherche] = useState('')

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })

  const changementRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) => updateUserRole(id, role),
    onSuccess: () => {
      message.success('Rôle mis à jour')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error) => message.error(errorMessage(error, 'Échec de la mise à jour du rôle')),
  })

  const confirmerChangement = (user: User, role: Role) => {
    modal.confirm({
      title: 'Changer le rôle ?',
      content: `${user.prenom} ${user.nom} passera au rôle « ${ROLE_LABELS[role]} ».`,
      okText: 'Confirmer',
      cancelText: 'Annuler',
      onOk: () => changementRole.mutateAsync({ id: user.id, role }),
    })
  }

  const donnees = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    if (!terme) return users ?? []
    return (users ?? []).filter((u) =>
      [u.nom, u.prenom, u.email, u.telephone]
        .filter(Boolean)
        .some((champ) => String(champ).toLowerCase().includes(terme)),
    )
  }, [users, recherche])

  const colonnes: ColumnsType<User> = [
    {
      title: 'Nom',
      key: 'nom',
      render: (_, u) => `${u.prenom} ${u.nom}`,
      sorter: (a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`),
    },
    { title: 'E-mail', dataIndex: 'email' },
    { title: 'Téléphone', dataIndex: 'telephone' },
    {
      title: 'Rôle',
      dataIndex: 'role',
      render: (role: Role, user) =>
        role === 'client' ? (
          <Tag>Client</Tag>
        ) : (
          <Select<Role>
            size="small"
            value={role}
            style={{ width: 160 }}
            onChange={(nouveauRole) => confirmerChangement(user, nouveauRole)}
            options={ROLES_PERSONNEL.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          />
        ),
      filters: (Object.keys(ROLE_LABELS) as Role[]).map((r) => ({
        text: ROLE_LABELS[r],
        value: r,
      })),
      onFilter: (value, u) => u.role === value,
    },
    {
      title: 'Solde wallet',
      dataIndex: 'soldeWallet',
      render: formatMontant,
      sorter: (a, b) => a.soldeWallet - b.soldeWallet,
    },
    {
      title: 'Inscrit le',
      dataIndex: 'createdAt',
      render: formatDate,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Utilisateurs
      </Typography.Title>
      <Card size="small">
        <Input.Search
          placeholder="Rechercher (nom, e-mail, téléphone...)"
          allowClear
          style={{ width: 300, marginBottom: 16 }}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <Table<User>
          rowKey="id"
          columns={colonnes}
          dataSource={donnees}
          loading={isLoading}
          size="middle"
          scroll={{ x: 800 }}
          pagination={{ pageSize: 15, showSizeChanger: true }}
        />
      </Card>
    </div>
  )
}
