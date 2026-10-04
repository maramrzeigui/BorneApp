import type {
  BadgeRfid,
  Borne,
  Facture,
  KpisClient,
  Mesure,
  Reservation,
  SessionRecharge,
  Utilisateur,
  Vehicule,
} from '@/types/domain';
import {
  mockBadges,
  mockBornes,
  mockFactures,
  mockKpis,
  mockSessionActive,
  mockSessions,
  mockUtilisateur,
  mockVehicules,
} from '@/lib/mock-data';
import * as storage from '@/lib/storage';
import Constants from 'expo-constants';

/**
 * Client API REST — cible le backend Laravel (dossier backend/, Sanctum).
 *
 * USE_MOCK = true fait revenir l'app aux données de lib/mock-data.ts
 * (utile sans backend). En dev, l'hôte de l'API est déduit de l'URL du
 * bundler Expo pour que téléphone, simulateur et web joignent tous la
 * machine qui exécute `php artisan serve`.
 */
export const USE_MOCK = false;

const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
export const API_URL = `http://${devHost}:8000/api/v1`;

const TOKEN_KEY = 'borneapp.jwt';

export async function getToken() {
  return storage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Erreur API (${res.status})`);
  }
  return res.json();
}

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Authentification
// ---------------------------------------------------------------------------

/** Retourne l'utilisateur, ou `null` si un code 2FA a été envoyé par email. */
export async function login(email: string, motDePasse: string): Promise<Utilisateur | null> {
  if (USE_MOCK) {
    await delay();
    if (!email.includes('@') || motDePasse.length < 4) {
      throw new Error('Email ou mot de passe invalide');
    }
    await storage.setItem(TOKEN_KEY, 'mock-jwt-token');
    return { ...mockUtilisateur, email };
  }
  const data = await request<{ token?: string; user?: Utilisateur; twoFactor?: boolean }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password: motDePasse }),
    }
  );
  if (data.twoFactor) return null;
  await storage.setItem(TOKEN_KEY, data.token!);
  return data.user!;
}

export async function verifier2fa(email: string, code: string): Promise<Utilisateur> {
  const data = await request<{ token: string; user: Utilisateur }>('/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  await storage.setItem(TOKEN_KEY, data.token);
  return data.user;
}

export async function motDePasseOublie(email: string): Promise<void> {
  if (USE_MOCK) {
    await delay();
    return;
  }
  await request('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function reinitialiserMotDePasse(
  email: string,
  code: string,
  motDePasse: string
): Promise<void> {
  await request('/auth/reset', {
    method: 'POST',
    body: JSON.stringify({ email, code, password: motDePasse }),
  });
}

export async function register(payload: {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
}): Promise<Utilisateur> {
  if (USE_MOCK) {
    await delay();
    await storage.setItem(TOKEN_KEY, 'mock-jwt-token');
    return { ...mockUtilisateur, nom: payload.nom, prenom: payload.prenom, email: payload.email };
  }
  const data = await request<{ token: string; user: Utilisateur }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...payload, password: payload.motDePasse }),
  });
  await storage.setItem(TOKEN_KEY, data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  if (!USE_MOCK) {
    await request('/auth/logout', { method: 'POST' }).catch(() => undefined);
  }
  await storage.removeItem(TOKEN_KEY);
}

export async function profil(): Promise<Utilisateur | null> {
  const token = await getToken();
  if (!token) return null;
  if (USE_MOCK) {
    await delay(200);
    return mockUtilisateur;
  }
  return request<Utilisateur>('/auth/me');
}

// ---------------------------------------------------------------------------
// Bornes & connecteurs
// ---------------------------------------------------------------------------

export async function listeBornes(): Promise<Borne[]> {
  if (USE_MOCK) {
    await delay();
    return mockBornes;
  }
  return request<Borne[]>('/bornes');
}

export async function detailBorne(id: number): Promise<Borne> {
  if (USE_MOCK) {
    await delay(250);
    const borne = mockBornes.find((b) => b.id === id);
    if (!borne) throw new Error('Borne introuvable');
    return borne;
  }
  return request<Borne>(`/bornes/${id}`);
}

// ---------------------------------------------------------------------------
// Sessions de recharge
// ---------------------------------------------------------------------------

export async function listeSessions(): Promise<SessionRecharge[]> {
  if (USE_MOCK) {
    await delay();
    return mockSessions;
  }
  return request<SessionRecharge[]>('/sessions');
}

export async function sessionActive(): Promise<SessionRecharge | null> {
  if (USE_MOCK) {
    await delay(200);
    return mockSessionActive;
  }
  const session = await request<SessionRecharge | null>('/sessions/active');
  return session?.id ? session : null;
}

/** Déclenche un RemoteStartTransaction côté serveur OCPP. */
export async function demarrerSession(borneId: number, connecteurId: number) {
  if (USE_MOCK) {
    await delay(600);
    return { ...mockSessionActive, borneId, connecteurId, dateDebut: new Date().toISOString() };
  }
  return request<SessionRecharge>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ borne_id: borneId, connecteur_id: connecteurId }),
  });
}

/** Déclenche un RemoteStopTransaction côté serveur OCPP. */
export async function arreterSession(sessionId: number) {
  if (USE_MOCK) {
    await delay(600);
    return {
      ...mockSessionActive,
      id: sessionId,
      etat: 'terminee' as const,
      dateFin: new Date().toISOString(),
    };
  }
  return request<SessionRecharge>(`/sessions/${sessionId}/stop`, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Profil : véhicules, badges, factures, KPIs
// ---------------------------------------------------------------------------

export async function listeVehicules(): Promise<Vehicule[]> {
  if (USE_MOCK) {
    await delay(200);
    return mockVehicules;
  }
  return request<Vehicule[]>('/vehicules');
}

export async function listeBadges(): Promise<BadgeRfid[]> {
  if (USE_MOCK) {
    await delay(200);
    return mockBadges;
  }
  return request<BadgeRfid[]>('/badges');
}

export async function listeFactures(): Promise<Facture[]> {
  if (USE_MOCK) {
    await delay(200);
    return mockFactures;
  }
  return request<Facture[]>('/factures');
}

export async function kpisClient(): Promise<KpisClient> {
  if (USE_MOCK) {
    await delay(200);
    return mockKpis;
  }
  return request<KpisClient>('/stats/client');
}

// ---------------------------------------------------------------------------
// Wallet & factures PDF
// ---------------------------------------------------------------------------

/** Recharge le wallet (sandbox : crédit immédiat). Retourne le nouveau solde. */
export async function rechargerWallet(montant: number): Promise<number> {
  if (USE_MOCK) {
    await delay();
    return mockUtilisateur.soldeWallet + montant;
  }
  const data = await request<{ soldeWallet: number }>('/wallet/topup', {
    method: 'POST',
    body: JSON.stringify({ montant }),
  });
  return data.soldeWallet;
}

/** URL de téléchargement du PDF d'une facture (à appeler avec le token). */
export function urlFacturePdf(factureId: number): string {
  return `${API_URL}/factures/${factureId}/pdf`;
}

// ---------------------------------------------------------------------------
// Télémétrie, réservations, favoris
// ---------------------------------------------------------------------------

/** Courbe de puissance d'une recharge (MeterValues OCPP enregistrées). */
export async function mesuresSession(sessionId: number): Promise<Mesure[]> {
  if (USE_MOCK) return [];
  return request<Mesure[]>(`/sessions/${sessionId}/mesures`);
}

export async function reservationActive(): Promise<Reservation | null> {
  if (USE_MOCK) return null;
  const r = await request<Reservation | null>('/reservations/active');
  return r?.id ? r : null;
}

/** Bloque la prise 15 minutes pour le client. */
export async function reserver(connecteurId: number): Promise<Reservation> {
  return request<Reservation>('/reservations', {
    method: 'POST',
    body: JSON.stringify({ connecteur_id: connecteurId }),
  });
}

export async function annulerReservation(id: number): Promise<void> {
  await request(`/reservations/${id}`, { method: 'DELETE' });
}

export async function favoris(): Promise<number[]> {
  if (USE_MOCK) return [];
  return request<number[]>('/favoris');
}

export async function basculerFavori(borneId: number, favori: boolean): Promise<void> {
  await request(`/favoris/${borneId}`, { method: favori ? 'POST' : 'DELETE' });
}
