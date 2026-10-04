// Types partagés du back-office BorneApp

export type Role =
  | 'client'
  | 'super_admin'
  | 'exploitant'
  | 'operateur'
  | 'technicien'
  | 'service_client'
  | 'finance'

export interface User {
  id: number
  nom: string
  prenom: string
  email: string
  telephone: string
  role: Role
  soldeWallet: number
  createdAt?: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface Stats {
  bornesTotal: number
  bornesActives: number
  bornesIndisponibles: number
  sessionsAujourdhui: number
  caTotal: number
  caAujourdhui: number
  kwhTotal: number
  tempsMoyenMinutes: number
}

export type EtatBorne =
  | 'disponible'
  | 'occupee'
  | 'hors_service'
  | 'maintenance'
  | 'deconnectee'
  | 'defaut'

export type TypeConnecteur = 'CCS' | 'Type2' | 'CHAdeMO' | 'AC' | 'DC'

export interface Connecteur {
  id: number
  borneId: number
  type: TypeConnecteur
  puissanceKw: number
  etat: string
}

export interface Borne {
  id: number
  nom: string
  reference: string
  numeroSerie: string
  modele: string
  fabricant: string
  adresse: string
  latitude: number
  longitude: number
  versionFirmware: string
  versionOcpp: string
  puissanceKw: number
  etat: EtatBorne
  dernierHeartbeat: string | null
  temperatureC: number | null
  tarifKwh: number
  connecteurs: Connecteur[]
}

export interface ConnecteurInput {
  type: TypeConnecteur
  puissanceKw: number
}

export interface BorneInput {
  nom: string
  reference: string
  numeroSerie: string
  modele: string
  fabricant: string
  adresse: string
  latitude: number
  longitude: number
  versionFirmware: string
  versionOcpp: string
  puissanceKw: number
  tarifKwh: number
  connecteurs: ConnecteurInput[]
  etat?: EtatBorne
}

export type EtatSession = 'en_cours' | 'en_pause' | 'terminee' | 'annulee'

export interface Session {
  id: number
  borneId: number
  borneNom: string
  userId: number
  userNom: string
  connecteurId: number
  typeConnecteur: TypeConnecteur | string
  dateDebut: string
  dateFin: string | null
  dureeMinutes: number
  energieKwh: number
  prix: number
  etat: EtatSession
}

export type GraviteAlerte = 'info' | 'warning' | 'critique'

export interface Alerte {
  id: number
  borneId: number
  borneNom: string
  type: string
  gravite: GraviteAlerte
  message: string
  resolue: boolean
  createdAt: string
}

export type StatutMaintenance = 'planifiee' | 'en_cours' | 'terminee'

export interface Maintenance {
  id: number
  borneId: number
  borneNom: string
  technicienId: number | null
  technicienNom: string | null
  statut: StatutMaintenance
  description: string
  datePrevue: string
  createdAt: string
}

export interface MaintenanceInput {
  borneId: number
  description: string
  datePrevue: string
  technicienId?: number
}

export interface AuditEntry {
  id: number
  userNom: string
  action: string
  cible: string
  details: string
  ip: string
  createdAt: string
}
