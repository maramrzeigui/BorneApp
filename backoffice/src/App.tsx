import { useCallback, useEffect, useState } from 'react'
import { App as AntApp, Avatar, Badge, Dropdown, Layout, Menu, Typography } from 'antd'
import {
  AlertOutlined,
  AuditOutlined,
  DashboardOutlined,
  LogoutOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { clearAuth, fetchAlertes, getStoredUser, logout, setOnUnauthorized } from './api'
import type { User } from './types'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import BornesPage from './pages/Bornes'
import SessionsPage from './pages/Sessions'
import UsersPage from './pages/Users'
import MaintenancesPage from './pages/Maintenances'
import AlertesPage from './pages/Alertes'
import AuditPage from './pages/Audit'

const { Sider, Header, Content } = Layout

export type PageKey =
  | 'dashboard'
  | 'bornes'
  | 'sessions'
  | 'users'
  | 'maintenances'
  | 'alertes'
  | 'audit'

export default function App() {
  const [user, setUser] = useState<User | null>(() => getStoredUser())
  const [page, setPage] = useState<PageKey>('dashboard')
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null)
      queryClient.clear()
    })
  }, [queryClient])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch {
      // Même en cas d'échec réseau, on déconnecte localement.
    }
    clearAuth()
    queryClient.clear()
    setUser(null)
    message.success('Déconnexion réussie')
  }, [message, queryClient])

  const { data: alertes } = useQuery({
    queryKey: ['alertes'],
    queryFn: fetchAlertes,
    refetchInterval: 30_000,
    enabled: !!user,
  })
  const alertesNonResolues = (alertes ?? []).filter((a) => !a.resolue).length

  if (!user) {
    return <LoginPage onLogin={setUser} />
  }

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Tableau de bord' },
    { key: 'bornes', icon: <ThunderboltOutlined />, label: 'Bornes' },
    { key: 'sessions', icon: <AuditOutlined />, label: 'Sessions' },
    { key: 'users', icon: <TeamOutlined />, label: 'Utilisateurs' },
    { key: 'maintenances', icon: <ToolOutlined />, label: 'Maintenance' },
    {
      key: 'alertes',
      icon: <AlertOutlined />,
      label: (
        <span>
          Alertes{' '}
          <Badge count={alertesNonResolues} size="small" offset={[4, -2]} />
        </span>
      ),
    },
    { key: 'audit', icon: <AuditOutlined />, label: 'Audit' },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" width={230}>
        <div
          style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ThunderboltOutlined style={{ color: '#faad14' }} /> BorneApp Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[page]}
          items={menuItems}
          onClick={({ key }) => setPage(key as PageKey)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Se déconnecter',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <Typography.Text strong>
                {user.prenom} {user.nom}
              </Typography.Text>
            </span>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24 }}>
          {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
          {page === 'bornes' && <BornesPage />}
          {page === 'sessions' && <SessionsPage />}
          {page === 'users' && <UsersPage />}
          {page === 'maintenances' && <MaintenancesPage />}
          {page === 'alertes' && <AlertesPage />}
          {page === 'audit' && <AuditPage />}
        </Content>
      </Layout>
    </Layout>
  )
}
