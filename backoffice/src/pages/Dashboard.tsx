import { useMemo } from 'react'
import { Card, Col, Empty, Row, Statistic, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { fetchBornes, fetchSessions, fetchStats } from '../api'
import {
  ETAT_BORNE_HEX,
  ETAT_BORNE_LABELS,
  ETAT_BORNE_COLORS,
  formatDuree,
  formatEnergie,
  formatMontant,
} from '../format'
import type { Borne, Session } from '../types'
import type { PageKey } from '../App'

const REFRESH_MS = 10_000

function markerIcon(borne: Borne): L.DivIcon {
  const color = ETAT_BORNE_HEX[borne.etat] ?? '#8c8c8c'
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

interface DailyPoint {
  jour: string
  label: string
  nombre: number
  kwh: number
}

function groupSessionsByDay(sessions: Session[]): DailyPoint[] {
  const start = dayjs().subtract(13, 'day').startOf('day')
  const points: DailyPoint[] = []
  const index = new Map<string, DailyPoint>()
  for (let i = 0; i < 14; i++) {
    const d = start.add(i, 'day')
    const point: DailyPoint = {
      jour: d.format('YYYY-MM-DD'),
      label: d.format('DD MMM'),
      nombre: 0,
      kwh: 0,
    }
    points.push(point)
    index.set(point.jour, point)
  }
  for (const s of sessions) {
    const d = dayjs(s.dateDebut)
    if (!d.isValid()) continue
    const point = index.get(d.format('YYYY-MM-DD'))
    if (point) {
      point.nombre += 1
      point.kwh += Number(s.energieKwh ?? 0)
    }
  }
  return points
}

function barOption(points: DailyPoint[], champ: 'nombre' | 'kwh', couleur: string, unite: string) {
  return {
    grid: { left: 48, right: 16, top: 24, bottom: 32 },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: number) =>
        champ === 'kwh' ? `${Number(v).toFixed(1).replace('.', ',')} ${unite}` : `${v} ${unite}`,
    },
    xAxis: {
      type: 'category',
      data: points.map((p) => p.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#d9d9d9' } },
      axisLabel: { color: '#595959' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#595959' },
    },
    series: [
      {
        type: 'bar',
        data: points.map((p) => (champ === 'kwh' ? Number(p.kwh.toFixed(2)) : p.nombre)),
        itemStyle: { color: couleur, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 22,
      },
    ],
  }
}

interface Props {
  onNavigate: (page: PageKey) => void
}

export default function DashboardPage({ onNavigate }: Props) {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: REFRESH_MS,
  })
  const { data: bornes } = useQuery({
    queryKey: ['bornes'],
    queryFn: fetchBornes,
    refetchInterval: REFRESH_MS,
  })
  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
    refetchInterval: REFRESH_MS,
  })

  const points = useMemo(() => groupSessionsByDay(sessions ?? []), [sessions])
  const bornesGeo = (bornes ?? []).filter(
    (b) => Number.isFinite(Number(b.latitude)) && Number.isFinite(Number(b.longitude)),
  )
  const center: [number, number] =
    bornesGeo.length > 0
      ? [Number(bornesGeo[0].latitude), Number(bornesGeo[0].longitude)]
      : [36.8065, 10.1815] // Tunis par défaut

  const kpis = [
    { titre: 'Bornes totales', valeur: stats?.bornesTotal },
    { titre: 'Bornes actives', valeur: stats?.bornesActives },
    { titre: 'Bornes indisponibles', valeur: stats?.bornesIndisponibles },
    { titre: "Sessions aujourd'hui", valeur: stats?.sessionsAujourdhui },
    { titre: 'CA total', valeur: stats ? formatMontant(stats.caTotal) : undefined },
    { titre: "CA aujourd'hui", valeur: stats ? formatMontant(stats.caAujourdhui) : undefined },
    { titre: 'Énergie totale', valeur: stats ? formatEnergie(stats.kwhTotal) : undefined },
    {
      titre: 'Temps moyen de charge',
      valeur: stats ? formatDuree(stats.tempsMoyenMinutes) : undefined,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        Tableau de bord
      </Typography.Title>

      <Row gutter={[16, 16]}>
        {kpis.map((kpi) => (
          <Col xs={12} sm={12} md={6} key={kpi.titre}>
            <Card size="small">
              <Statistic title={kpi.titre} value={kpi.valeur ?? '—'} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="Carte des bornes"
        size="small"
        extra={
          <span>
            {(Object.keys(ETAT_BORNE_LABELS) as (keyof typeof ETAT_BORNE_LABELS)[]).map((etat) => (
              <Tag key={etat} color={ETAT_BORNE_COLORS[etat]}>
                {ETAT_BORNE_LABELS[etat]}
              </Tag>
            ))}
          </span>
        }
      >
        {bornesGeo.length === 0 ? (
          <Empty description="Aucune borne géolocalisée" />
        ) : (
          <MapContainer center={center} zoom={7} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {bornesGeo.map((borne) => (
              <Marker
                key={borne.id}
                position={[Number(borne.latitude), Number(borne.longitude)]}
                icon={markerIcon(borne)}
              >
                <Popup>
                  <strong>{borne.nom}</strong>
                  <br />
                  État : {ETAT_BORNE_LABELS[borne.etat] ?? borne.etat}
                  <br />
                  <a
                    onClick={(e) => {
                      e.preventDefault()
                      onNavigate('bornes')
                    }}
                    href="#bornes"
                  >
                    Voir le détail
                  </a>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Sessions par jour (14 derniers jours)" size="small">
            <ReactECharts
              option={barOption(points, 'nombre', '#1677ff', 'sessions')}
              style={{ height: 280 }}
              notMerge
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Énergie délivrée par jour (kWh)" size="small">
            <ReactECharts
              option={barOption(points, 'kwh', '#08979c', 'kWh')}
              style={{ height: 280 }}
              notMerge
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
