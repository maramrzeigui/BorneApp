import axios, { AxiosError } from 'axios'
import type {
  Alerte,
  AuditEntry,
  Borne,
  BorneInput,
  LoginResponse,
  Maintenance,
  MaintenanceInput,
  Role,
  Session,
  Stats,
  User,
} from './types'

const TOKEN_KEY = 'borneapp_token'
const USER_KEY = 'borneapp_user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function storeAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const api = axios.create({
  baseURL: '/api/v1',
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let onUnauthorized: (() => void) | null = null

export function setOnUnauthorized(handler: () => void): void {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearAuth()
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

/** Extrait un message d'erreur lisible d'une erreur axios. */
export function errorMessage(error: unknown, fallback = 'Erreur réseau'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    if (data?.message) return data.message
    if (error.response) return `Erreur ${error.response.status}`
  }
  return fallback
}

/**
 * Enveloppe pour les requêtes de lecture : si le backend n'est pas prêt
 * (404/500...), on renvoie une valeur de repli pour afficher un état vide
 * propre au lieu de bloquer l'interface.
 */
async function safeGet<T>(url: string, fallback: T): Promise<T> {
  try {
    const { data } = await api.get<T>(url)
    return data ?? fallback
  } catch (error) {
    if (axios.isAxiosError(error) && error.response && error.response.status !== 401) {
      console.warn(`GET ${url} → ${error.response.status}, état vide affiché`)
      return fallback
    }
    throw error
  }
}

// --- Authentification ---

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

// --- Endpoints admin ---

export const fetchStats = (): Promise<Stats | null> => safeGet<Stats | null>('/admin/stats', null)

export const fetchBornes = (): Promise<Borne[]> => safeGet<Borne[]>('/admin/bornes', [])

export async function createBorne(input: BorneInput): Promise<Borne> {
  const { data } = await api.post<Borne>('/admin/bornes', input)
  return data
}

export async function updateBorne(id: number, input: Partial<BorneInput>): Promise<Borne> {
  const { data } = await api.put<Borne>(`/admin/bornes/${id}`, input)
  return data
}

export async function deleteBorne(id: number): Promise<void> {
  await api.delete(`/admin/bornes/${id}`)
}

export async function commandeBorne(
  id: number,
  commande: 'reset' | 'unlock',
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(`/admin/bornes/${id}/commande`, { commande })
  return data
}

export const fetchSessions = (): Promise<Session[]> => safeGet<Session[]>('/admin/sessions', [])

export const fetchUsers = (): Promise<User[]> => safeGet<User[]>('/admin/users', [])

export async function updateUserRole(id: number, role: Role): Promise<User> {
  const { data } = await api.put<User>(`/admin/users/${id}`, { role })
  return data
}

export const fetchAlertes = (): Promise<Alerte[]> => safeGet<Alerte[]>('/admin/alertes', [])

export async function resoudreAlerte(id: number): Promise<void> {
  await api.put(`/admin/alertes/${id}/resoudre`)
}

export const fetchMaintenances = (): Promise<Maintenance[]> =>
  safeGet<Maintenance[]>('/admin/maintenances', [])

export async function createMaintenance(input: MaintenanceInput): Promise<Maintenance> {
  const { data } = await api.post<Maintenance>('/admin/maintenances', input)
  return data
}

export async function updateMaintenanceStatut(
  id: number,
  statut: Maintenance['statut'],
): Promise<Maintenance> {
  const { data } = await api.put<Maintenance>(`/admin/maintenances/${id}`, { statut })
  return data
}

export const fetchAudit = (): Promise<AuditEntry[]> => safeGet<AuditEntry[]>('/admin/audit', [])
