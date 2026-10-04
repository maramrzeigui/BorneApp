/**
 * Modèle de domaine — aligné sur le cahier des charges "Bornes de recharge".
 * Ces types reflètent les ressources exposées par l'API REST Laravel.
 */

export type Role =
  | 'super_admin'
  | 'exploitant'
  | 'operateur'
  | 'technicien'
  | 'service_client'
  | 'finance'
  | 'client';

export type EtatBorne =
  | 'disponible'
  | 'occupee'
  | 'hors_service'
  | 'maintenance'
  | 'deconnectee'
  | 'defaut'
  | 'inconnu';

export type TypeConnecteur = 'CCS' | 'Type2' | 'CHAdeMO' | 'AC' | 'DC';

export type EtatConnecteur = 'disponible' | 'occupe' | 'reserve' | 'indisponible' | 'inconnu';

/** reseau : bornes de l'exploitant (pilotables). publique : bornes d'autres opérateurs, en consultation seule. */
export type SourceBorne = 'reseau' | 'publique';

export type EtatSession = 'en_cours' | 'en_pause' | 'terminee' | 'annulee';

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: Role;
  soldeWallet: number;
}

export interface Connecteur {
  id: number;
  borneId: number;
  type: TypeConnecteur;
  puissanceKw: number;
  etat: EtatConnecteur;
}

export interface Borne {
  id: number;
  source: SourceBorne;
  operateur: string | null;
  nom: string;
  reference: string;
  numeroSerie: string | null;
  modele: string | null;
  fabricant: string | null;
  adresse: string;
  latitude: number;
  longitude: number;
  versionFirmware: string | null;
  versionOcpp: '1.6' | '2.0.1' | null;
  puissanceKw: number | null;
  etat: EtatBorne;
  dernierHeartbeat: string | null; // ISO 8601
  temperatureC?: number;
  connecteurs: Connecteur[];
  tarifKwh: number; // prix courant €/kWh (ou TND selon paramétrage)
}

export interface SessionRecharge {
  id: number;
  borneId: number;
  borneNom: string;
  connecteurId: number;
  typeConnecteur: TypeConnecteur;
  vehiculeId?: number;
  dateDebut: string;
  dateFin?: string;
  dureeMinutes?: number;
  energieKwh: number;
  prix: number;
  etat: EtatSession;
  puissanceInstantaneeKw?: number; // renseigné quand la session est en cours
  pourcentageBatterie?: number;
}

export interface Vehicule {
  id: number;
  marque: string;
  modele: string;
  immatriculation: string;
  typeConnecteur: TypeConnecteur;
  capaciteBatterieKwh: number;
}

export interface BadgeRfid {
  id: number;
  uid: string;
  actif: boolean;
  dateExpiration?: string;
}

export interface Facture {
  id: number;
  sessionId: number;
  numero: string;
  date: string;
  montantTtc: number;
  urlPdf?: string;
}

export interface StatMois {
  mois: string; // AAAA-MM
  kwh: number;
  prix: number;
  sessions: number;
}

export interface KpisClient {
  sessionsTotal: number;
  energieTotaleKwh: number;
  depensesTotal: number;
  dureeMoyenneMinutes: number;
  parMois: StatMois[];
  /** Autonomie ajoutée, sur la base de `kwhAux100Km`. */
  kmAjoutes: number;
  kwhAux100Km: number;
}

/** Point de télémétrie OCPP (MeterValues). */
export interface Mesure {
  t: string;
  energieKwh: number;
  puissanceKw: number | null;
  pourcentageBatterie: number | null;
}

export interface Reservation {
  id: number;
  borneId: number;
  borneNom: string;
  connecteurId: number;
  typeConnecteur: TypeConnecteur;
  puissanceKw: number;
  expireLe: string;
}
