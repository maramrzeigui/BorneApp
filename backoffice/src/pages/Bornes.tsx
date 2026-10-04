import { useMemo, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  commandeBorne,
  createBorne,
  deleteBorne,
  errorMessage,
  fetchBornes,
  updateBorne,
} from '../api'
import {
  ETAT_BORNE_COLORS,
  ETAT_BORNE_LABELS,
  formatMontant,
  formatRelatif,
} from '../format'
import type { Borne, BorneInput, EtatBorne, TypeConnecteur } from '../types'

const TYPES_CONNECTEUR: TypeConnecteur[] = ['CCS', 'Type2', 'CHAdeMO', 'AC', 'DC']

interface FormValues extends Omit<BorneInput, 'connecteurs'> {
  connecteurs: { type: TypeConnecteur; puissanceKw: number }[]
  etat?: EtatBorne
}

export default function BornesPage() {
  const { message, modal } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [recherche, setRecherche] = useState('')
  const [filtreEtat, setFiltreEtat] = useState<EtatBorne | undefined>(undefined)
  const [modalOuverte, setModalOuverte] = useState(false)
  const [borneEnEdition, setBorneEnEdition] = useState<Borne | null>(null)
  const [borneDetail, setBorneDetail] = useState<Borne | null>(null)
  const [form] = Form.useForm<FormValues>()

  const { data: bornes, isLoading } = useQuery({ queryKey: ['bornes'], queryFn: fetchBornes })

  const invalider = () => {
    queryClient.invalidateQueries({ queryKey: ['bornes'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  const sauvegarde = useMutation({
    mutationFn: async (values: FormValues) => {
      if (borneEnEdition) {
        return updateBorne(borneEnEdition.id, values)
      }
      return createBorne(values)
    },
    onSuccess: () => {
      message.success(borneEnEdition ? 'Borne modifiée' : 'Borne créée')
      setModalOuverte(false)
      setBorneEnEdition(null)
      form.resetFields()
      invalider()
    },
    onError: (error) => message.error(errorMessage(error, "Échec de l'enregistrement")),
  })

  const desactivation = useMutation({
    mutationFn: deleteBorne,
    onSuccess: () => {
      message.success('Borne désactivée (hors service)')
      invalider()
    },
    onError: (error) => message.error(errorMessage(error, 'Échec de la désactivation')),
  })

  const commande = useMutation({
    mutationFn: ({ id, cmd }: { id: number; cmd: 'reset' | 'unlock' }) => commandeBorne(id, cmd),
    onSuccess: (data) => {
      message.success(data.message || 'Commande envoyée')
      invalider()
    },
    onError: (error) => message.error(errorMessage(error, "Échec de l'envoi de la commande")),
  })

  const ouvrirCreation = () => {
    setBorneEnEdition(null)
    form.resetFields()
    form.setFieldsValue({ connecteurs: [{ type: 'Type2', puissanceKw: 22 }] })
    setModalOuverte(true)
  }

  const ouvrirEdition = (borne: Borne) => {
    setBorneEnEdition(borne)
    form.setFieldsValue({
      nom: borne.nom,
      reference: borne.reference,
      numeroSerie: borne.numeroSerie,
      modele: borne.modele,
      fabricant: borne.fabricant,
      adresse: borne.adresse,
      latitude: borne.latitude,
      longitude: borne.longitude,
      versionFirmware: borne.versionFirmware,
      versionOcpp: borne.versionOcpp,
      puissanceKw: borne.puissanceKw,
      tarifKwh: borne.tarifKwh,
      etat: borne.etat,
      connecteurs: borne.connecteurs?.map((c) => ({ type: c.type, puissanceKw: c.puissanceKw })) ?? [],
    })
    setModalOuverte(true)
  }

  const confirmerCommande = (borne: Borne, cmd: 'reset' | 'unlock') => {
    modal.confirm({
      title: cmd === 'reset' ? 'Réinitialiser la borne ?' : 'Déverrouiller le connecteur ?',
      content: `Une commande OCPP « ${cmd} » sera envoyée à la borne « ${borne.nom} ».`,
      okText: 'Envoyer',
      cancelText: 'Annuler',
      onOk: () => commande.mutateAsync({ id: borne.id, cmd }),
    })
  }

  const donnees = useMemo(() => {
    const terme = recherche.trim().toLowerCase()
    return (bornes ?? []).filter((b) => {
      if (filtreEtat && b.etat !== filtreEtat) return false
      if (!terme) return true
      return [b.nom, b.reference, b.numeroSerie, b.adresse, b.modele, b.fabricant]
        .filter(Boolean)
        .some((champ) => String(champ).toLowerCase().includes(terme))
    })
  }, [bornes, recherche, filtreEtat])

  const colonnes: ColumnsType<Borne> = [
    {
      title: 'Nom',
      dataIndex: 'nom',
      sorter: (a, b) => a.nom.localeCompare(b.nom),
      render: (nom: string, borne) => (
        <a onClick={() => setBorneDetail(borne)}>{nom}</a>
      ),
    },
    { title: 'Référence', dataIndex: 'reference' },
    {
      title: 'État',
      dataIndex: 'etat',
      render: (etat: EtatBorne) => (
        <Tag color={ETAT_BORNE_COLORS[etat] ?? 'default'}>{ETAT_BORNE_LABELS[etat] ?? etat}</Tag>
      ),
    },
    {
      title: 'Puissance',
      dataIndex: 'puissanceKw',
      render: (p: number) => `${p} kW`,
      sorter: (a, b) => a.puissanceKw - b.puissanceKw,
    },
    {
      title: 'Tarif',
      dataIndex: 'tarifKwh',
      render: (t: number) => `${formatMontant(t)}/kWh`,
    },
    {
      title: 'Dernier heartbeat',
      dataIndex: 'dernierHeartbeat',
      render: (d: string | null) => formatRelatif(d),
    },
    {
      title: 'Connecteurs',
      dataIndex: 'connecteurs',
      render: (connecteurs: Borne['connecteurs']) => connecteurs?.length ?? 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, borne) => (
        <Space size={4} wrap>
          <Tooltip title="Détail">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setBorneDetail(borne)} />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button size="small" icon={<EditOutlined />} onClick={() => ouvrirEdition(borne)} />
          </Tooltip>
          <Tooltip title="Reset (OCPP)">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => confirmerCommande(borne, 'reset')}
            />
          </Tooltip>
          <Tooltip title="Unlock (OCPP)">
            <Button
              size="small"
              icon={<UnlockOutlined />}
              onClick={() => confirmerCommande(borne, 'unlock')}
            />
          </Tooltip>
          <Popconfirm
            title="Désactiver cette borne ?"
            description="Elle passera à l'état « hors service »."
            okText="Désactiver"
            cancelText="Annuler"
            onConfirm={() => desactivation.mutate(borne.id)}
          >
            <Tooltip title="Désactiver">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Bornes
      </Typography.Title>
      <Card size="small">
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="Rechercher (nom, référence, adresse...)"
            allowClear
            style={{ width: 280 }}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <Select<EtatBorne>
            placeholder="Filtrer par état"
            allowClear
            style={{ width: 180 }}
            value={filtreEtat}
            onChange={setFiltreEtat}
            options={(Object.keys(ETAT_BORNE_LABELS) as EtatBorne[]).map((etat) => ({
              value: etat,
              label: ETAT_BORNE_LABELS[etat],
            }))}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={ouvrirCreation}>
            Ajouter une borne
          </Button>
        </Space>
        <Table<Borne>
          rowKey="id"
          columns={colonnes}
          dataSource={donnees}
          loading={isLoading}
          size="middle"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={borneEnEdition ? `Modifier « ${borneEnEdition.nom} »` : 'Ajouter une borne'}
        open={modalOuverte}
        onCancel={() => {
          setModalOuverte(false)
          setBorneEnEdition(null)
        }}
        onOk={() => form.submit()}
        okText="Enregistrer"
        cancelText="Annuler"
        confirmLoading={sauvegarde.isPending}
        width={720}
        destroyOnClose={false}
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => sauvegarde.mutate(values)}
        >
          <Space.Compact block>
            <Form.Item
              name="nom"
              label="Nom"
              rules={[{ required: true, message: 'Nom requis' }]}
              style={{ flex: 1, marginRight: 8 }}
            >
              <Input placeholder="Borne Tunis Centre" />
            </Form.Item>
            <Form.Item
              name="reference"
              label="Référence"
              rules={[{ required: true, message: 'Référence requise' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="BRN-001" />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item
              name="numeroSerie"
              label="Numéro de série"
              rules={[{ required: true, message: 'Numéro de série requis' }]}
              style={{ flex: 1, marginRight: 8 }}
            >
              <Input />
            </Form.Item>
            <Form.Item name="modele" label="Modèle" style={{ flex: 1, marginRight: 8 }}>
              <Input />
            </Form.Item>
            <Form.Item name="fabricant" label="Fabricant" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space.Compact>
          <Form.Item
            name="adresse"
            label="Adresse"
            rules={[{ required: true, message: 'Adresse requise' }]}
          >
            <Input />
          </Form.Item>
          <Space.Compact block>
            <Form.Item
              name="latitude"
              label="Latitude"
              rules={[{ required: true, message: 'Latitude requise' }]}
              style={{ flex: 1, marginRight: 8 }}
            >
              <InputNumber style={{ width: '100%' }} min={-90} max={90} step={0.000001} />
            </Form.Item>
            <Form.Item
              name="longitude"
              label="Longitude"
              rules={[{ required: true, message: 'Longitude requise' }]}
              style={{ flex: 1, marginRight: 8 }}
            >
              <InputNumber style={{ width: '100%' }} min={-180} max={180} step={0.000001} />
            </Form.Item>
            <Form.Item
              name="puissanceKw"
              label="Puissance (kW)"
              rules={[{ required: true, message: 'Puissance requise' }]}
              style={{ flex: 1, marginRight: 8 }}
            >
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
            <Form.Item
              name="tarifKwh"
              label="Tarif (DT/kWh)"
              rules={[{ required: true, message: 'Tarif requis' }]}
              style={{ flex: 1 }}
            >
              <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item name="versionFirmware" label="Firmware" style={{ flex: 1, marginRight: 8 }}>
              <Input placeholder="1.0.0" />
            </Form.Item>
            <Form.Item name="versionOcpp" label="Version OCPP" style={{ flex: 1 }}>
              <Input placeholder="1.6" />
            </Form.Item>
          </Space.Compact>
          {borneEnEdition && (
            <Form.Item name="etat" label="État">
              <Select
                options={(Object.keys(ETAT_BORNE_LABELS) as EtatBorne[]).map((etat) => ({
                  value: etat,
                  label: ETAT_BORNE_LABELS[etat],
                }))}
              />
            </Form.Item>
          )}
          <Typography.Text strong>Connecteurs</Typography.Text>
          <Form.List
            name="connecteurs"
            rules={[
              {
                validator: async (_, value) => {
                  if (!value || value.length === 0) {
                    throw new Error('Au moins un connecteur est requis')
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <div style={{ marginTop: 8 }}>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex' }}>
                    <Form.Item
                      name={[field.name, 'type']}
                      rules={[{ required: true, message: 'Type requis' }]}
                    >
                      <Select
                        placeholder="Type"
                        style={{ width: 140 }}
                        options={TYPES_CONNECTEUR.map((t) => ({ value: t, label: t }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'puissanceKw']}
                      rules={[{ required: true, message: 'Puissance requise' }]}
                    >
                      <InputNumber placeholder="kW" min={0} style={{ width: 120 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ type: 'Type2', puissanceKw: 22 })}
                  icon={<PlusOutlined />}
                  block
                >
                  Ajouter un connecteur
                </Button>
                <Form.ErrorList errors={errors} />
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Drawer
        title={borneDetail?.nom}
        open={!!borneDetail}
        onClose={() => setBorneDetail(null)}
        width={520}
      >
        {borneDetail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Référence">{borneDetail.reference}</Descriptions.Item>
              <Descriptions.Item label="Numéro de série">
                {borneDetail.numeroSerie}
              </Descriptions.Item>
              <Descriptions.Item label="Modèle">{borneDetail.modele || '—'}</Descriptions.Item>
              <Descriptions.Item label="Fabricant">
                {borneDetail.fabricant || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Adresse">{borneDetail.adresse}</Descriptions.Item>
              <Descriptions.Item label="Coordonnées">
                {borneDetail.latitude}, {borneDetail.longitude}
              </Descriptions.Item>
              <Descriptions.Item label="État">
                <Tag color={ETAT_BORNE_COLORS[borneDetail.etat]}>
                  {ETAT_BORNE_LABELS[borneDetail.etat] ?? borneDetail.etat}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Puissance">{borneDetail.puissanceKw} kW</Descriptions.Item>
              <Descriptions.Item label="Tarif">
                {formatMontant(borneDetail.tarifKwh)}/kWh
              </Descriptions.Item>
              <Descriptions.Item label="Firmware">
                {borneDetail.versionFirmware || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Version OCPP">
                {borneDetail.versionOcpp || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Dernier heartbeat">
                {formatRelatif(borneDetail.dernierHeartbeat)}
              </Descriptions.Item>
              <Descriptions.Item label="Température">
                {borneDetail.temperatureC != null ? `${borneDetail.temperatureC} °C` : '—'}
              </Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              Connecteurs
            </Typography.Title>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={borneDetail.connecteurs ?? []}
              columns={[
                { title: 'Type', dataIndex: 'type' },
                {
                  title: 'Puissance',
                  dataIndex: 'puissanceKw',
                  render: (p: number) => `${p} kW`,
                },
                { title: 'État', dataIndex: 'etat', render: (e: string) => <Tag>{e}</Tag> },
              ]}
            />
          </>
        )}
      </Drawer>
    </div>
  )
}
