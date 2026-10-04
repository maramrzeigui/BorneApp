import dayjs from 'dayjs'
import type { EtatBorne, EtatSession, GraviteAlerte, Role, StatutMaintenance } from './types'

/** "12,34 DT" */
export function formatMontant(valeur: number | null | undefined): string {
  const n = Number(valeur ?? 0)
  return `${n.toFixed(2).replace('.', ',')} DT`
}

/** "12,5 kWh" */
export function formatEnergie(valeur: number | null | undefined): string {
  const n = Number(valeur ?? 0)
  const texte = Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
  return `${texte} kWh`
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  const d = dayjs(date)
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : '—'
}

export function formatRelatif(date: string | null | undefined): string {
  if (!date) return 'jamais'
  const d = dayjs(date)
  return d.isValid() ? d.fromNow() : '—'
}

export function formatDuree(minutes: number | null | undefined): string {
  const m = Math.round(Number(minutes ?? 0))
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
}

// --- Libellés & couleurs ---

export const ETAT_BORNE_LABELS: Record<EtatBorne, string> = {
  disponible: 'Disponible',
  occupee: 'Occupée',
  hors_service: 'Hors service',
  maintenance: 'Maintenance',
  deconnectee: 'Déconnectée',
  defaut: 'Défaut',
}

export const ETAT_BORNE_COLORS: Record<EtatBorne, string> = {
  disponible: 'green',
  occupee: 'blue',
  hors_service: 'default',
  maintenance: 'orange',
  deconnectee: 'volcano',
  defaut: 'red',
}

/** Couleurs hexa pour les marqueurs de la carte. */
export const ETAT_BORNE_HEX: Record<EtatBorne, string> = {
  disponible: '#52c41a',
  occupee: '#1677ff',
  hors_service: '#8c8c8c',
  maintenance: '#fa8c16',
  deconnectee: '#d4380d',
  defaut: '#f5222d',
}

export const ETAT_SESSION_LABELS: Record<EtatSession, string> = {
  en_cours: 'En cours',
  en_pause: 'En pause',
  terminee: 'Terminée',
  annulee: 'Annulée',
}

export const ETAT_SESSION_COLORS: Record<EtatSession, string> = {
  en_cours: 'processing',
  en_pause: 'warning',
  terminee: 'success',
  annulee: 'error',
}

export const GRAVITE_LABELS: Record<GraviteAlerte, string> = {
  info: 'Info',
  warning: 'Avertissement',
  critique: 'Critique',
}

export const GRAVITE_COLORS: Record<GraviteAlerte, string> = {
  info: 'blue',
  warning: 'orange',
  critique: 'red',
}

export const STATUT_MAINTENANCE_LABELS: Record<StatutMaintenance, string> = {
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  terminee: 'Terminée',
}

export const STATUT_MAINTENANCE_COLORS: Record<StatutMaintenance, string> = {
  planifiee: 'blue',
  en_cours: 'orange',
  terminee: 'green',
}

export const ROLE_LABELS: Record<Role, string> = {
  client: 'Client',
  super_admin: 'Super admin',
  exploitant: 'Exploitant',
  operateur: 'Opérateur',
  technicien: 'Technicien',
  service_client: 'Service client',
  finance: 'Finance',
}

export const ROLES_PERSONNEL: Role[] = [
  'super_admin',
  'exploitant',
  'operateur',
  'technicien',
  'service_client',
  'finance',
]
