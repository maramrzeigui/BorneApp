import { useState } from 'react'
import { App as AntApp, Button, Card, Form, Input, Typography } from 'antd'
import { LockOutlined, MailOutlined, ThunderboltFilled } from '@ant-design/icons'
import { errorMessage, login, storeAuth } from '../api'
import type { User } from '../types'

interface Props {
  onLogin: (user: User) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [loading, setLoading] = useState(false)
  const { message } = AntApp.useApp()

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const { token, user } = await login(values.email, values.password)
      if (user.role === 'client') {
        message.error('Accès réservé au personnel')
        return
      }
      storeAuth(token, user)
      onLogin(user)
      message.success(`Bienvenue, ${user.prenom} ${user.nom}`)
    } catch (error) {
      message.error(errorMessage(error, 'Échec de la connexion'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b1f3a 0%, #1677ff 100%)',
        padding: 16,
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <ThunderboltFilled style={{ fontSize: 40, color: '#faad14' }} />
          <Typography.Title level={3} style={{ marginTop: 8, marginBottom: 4 }}>
            BorneApp Admin
          </Typography.Title>
          <Typography.Text type="secondary">
            Back-office de supervision des bornes de recharge
          </Typography.Text>
        </div>
        <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="email"
            label="Adresse e-mail"
            rules={[
              { required: true, message: 'Veuillez saisir votre e-mail' },
              { type: 'email', message: 'Adresse e-mail invalide' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@borneapp.tn" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mot de passe"
            rules={[{ required: true, message: 'Veuillez saisir votre mot de passe' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Se connecter
          </Button>
        </Form>
      </Card>
    </div>
  )
}
