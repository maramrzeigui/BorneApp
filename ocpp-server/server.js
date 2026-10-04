/**
 * Serveur OCPP 1.6J (profil JSON) pour BorneApp.
 *
 * - Les bornes se connectent en WebSocket sur ws://HOTE:9220/ocpp/{reference}
 *   (sous-protocole "ocpp1.6") et envoient les messages CALL standard :
 *   BootNotification, Heartbeat, StatusNotification, StartTransaction,
 *   StopTransaction, MeterValues.
 * - Chaque événement est relayé à l'API Laravel (routes /api/v1/internal/ocpp/*,
 *   authentifiées par le secret partagé X-Ocpp-Secret).
 * - Un petit serveur HTTP (port 9221) reçoit les commandes du backend
 *   (RemoteStartTransaction, RemoteStopTransaction, Reset, UnlockConnector)
 *   et les transmet à la borne concernée.
 *
 * Lancer : npm start   (variables : LARAVEL_URL, OCPP_SHARED_SECRET)
 */
import http from 'node:http';
import { WebSocketServer } from 'ws';

const OCPP_PORT = Number(process.env.OCPP_PORT ?? 9220);
const HTTP_PORT = Number(process.env.HTTP_PORT ?? 9221);
const LARAVEL_URL = process.env.LARAVEL_URL ?? 'http://127.0.0.1:8000/api/v1';
const SECRET = process.env.OCPP_SHARED_SECRET ?? 'borneapp-ocpp-secret-dev';

// Types de message OCPP-J
const CALL = 2;
const CALLRESULT = 3;
const CALLERROR = 4;

/** reference borne -> { ws, pending: Map<messageId, resolve> } */
const bornes = new Map();
/** transactionId OCPP -> sessionId Laravel */
const transactions = new Map();

const log = (...args) => console.log(new Date().toISOString(), ...args);

async function versLaravel(path, payload) {
  try {
    const res = await fetch(`${LARAVEL_URL}/internal/ocpp${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Ocpp-Secret': SECRET,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) log(`⚠️ Laravel ${path} → ${res.status}`);
    return res.ok;
  } catch (err) {
    log(`⚠️ Laravel injoignable (${path}): ${err.message}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Serveur WebSocket OCPP (côté bornes)
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ port: OCPP_PORT, handleProtocols: (protocols) =>
  protocols.has('ocpp1.6') ? 'ocpp1.6' : false,
});

wss.on('connection', (ws, req) => {
  const match = req.url?.match(/\/ocpp\/(.+)$/);
  if (!match) {
    ws.close(1008, 'URL attendue : /ocpp/{reference}');
    return;
  }
  const reference = decodeURIComponent(match[1]);
  bornes.set(reference, { ws, pending: new Map() });
  log(`🔌 Borne connectée : ${reference}`);

  ws.on('message', async (raw) => {
    let frame;
    try {
      frame = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const [type, messageId, actionOuPayload, payload] = frame;

    if (type === CALLRESULT || type === CALLERROR) {
      // Réponse à une de nos commandes (RemoteStart…, Reset…)
      const entry = bornes.get(reference);
      const resolve = entry?.pending.get(messageId);
      if (resolve) {
        entry.pending.delete(messageId);
        resolve(type === CALLRESULT ? actionOuPayload : { errorCode: actionOuPayload });
      }
      return;
    }

    if (type !== CALL) return;
    const action = actionOuPayload;
    const reponse = await traiterAction(reference, action, payload ?? {});
    ws.send(JSON.stringify([CALLRESULT, messageId, reponse]));
  });

  ws.on('close', () => {
    bornes.delete(reference);
    log(`❌ Borne déconnectée : ${reference}`);
  });
});

async function traiterAction(reference, action, payload) {
  switch (action) {
    case 'BootNotification':
      await versLaravel('/boot', {
        reference,
        versionFirmware: payload.firmwareVersion ?? null,
      });
      return { status: 'Accepted', currentTime: new Date().toISOString(), interval: 30 };

    case 'Heartbeat':
      await versLaravel('/heartbeat', {
        reference,
        temperatureC: payload.customTemperature ?? null,
      });
      return { currentTime: new Date().toISOString() };

    case 'StatusNotification': {
      // Statuts OCPP → états métier
      const mapping = {
        Available: 'disponible',
        Charging: 'occupee',
        Faulted: 'defaut',
        Unavailable: 'hors_service',
      };
      const etat = mapping[payload.status];
      if (etat) await versLaravel('/status', { reference, etat });
      return {};
    }

    case 'Authorize':
      return { idTagInfo: { status: 'Accepted' } };

    case 'StartTransaction': {
      // idTag = sessionId Laravel transmis dans RemoteStartTransaction
      const sessionId = Number(payload.idTag);
      const transactionId = sessionId || Date.now();
      transactions.set(transactionId, sessionId);
      return { transactionId, idTagInfo: { status: 'Accepted' } };
    }

    case 'MeterValues': {
      const sessionId = transactions.get(payload.transactionId) ?? payload.transactionId;
      const sample = payload.meterValue?.at(-1)?.sampledValue ?? [];
      const valeur = (mesure) => {
        const v = sample.find((s) => s.measurand === mesure)?.value;
        return v != null ? Number(v) : null;
      };
      await versLaravel('/meter-values', {
        sessionId,
        energieKwh: (valeur('Energy.Active.Import.Register') ?? 0) / 1000, // Wh → kWh
        puissanceKw: (valeur('Power.Active.Import') ?? 0) / 1000, // W → kW
        pourcentageBatterie: valeur('SoC'),
      });
      return {};
    }

    case 'StopTransaction': {
      const sessionId = transactions.get(payload.transactionId) ?? payload.transactionId;
      transactions.delete(payload.transactionId);
      await versLaravel('/stop-transaction', {
        sessionId,
        energieKwh: payload.meterStop != null ? payload.meterStop / 1000 : null,
      });
      return { idTagInfo: { status: 'Accepted' } };
    }

    default:
      log(`Action OCPP non gérée : ${action}`);
      return {};
  }
}

/** Envoie un CALL à une borne et attend sa réponse (5 s max). */
function commanderBorne(reference, action, payload) {
  const entry = bornes.get(reference);
  if (!entry) return Promise.resolve(null);

  const messageId = Math.random().toString(36).slice(2);
  entry.ws.send(JSON.stringify([CALL, messageId, action, payload]));

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      entry.pending.delete(messageId);
      resolve(null);
    }, 5000);
    entry.pending.set(messageId, (reponse) => {
      clearTimeout(timer);
      resolve(reponse);
    });
  });
}

// ---------------------------------------------------------------------------
// Serveur HTTP de commandes (côté backend Laravel)
// ---------------------------------------------------------------------------

const commandes = {
  '/commands/remote-start': async ({ reference, connecteurId, sessionId }) => {
    const r = await commanderBorne(reference, 'RemoteStartTransaction', {
      idTag: String(sessionId),
      connectorId: connecteurId,
    });
    return r?.status === 'Accepted'
      ? { ok: true, message: 'Recharge lancée sur la borne.' }
      : { ok: false, message: 'Borne hors ligne — session en mode simulation.' };
  },
  '/commands/remote-stop': async ({ reference, sessionId }) => {
    const r = await commanderBorne(reference, 'RemoteStopTransaction', {
      transactionId: sessionId,
    });
    return r?.status === 'Accepted'
      ? { ok: true, message: 'Arrêt demandé à la borne.' }
      : { ok: false, message: 'Borne hors ligne.' };
  },
  '/commands/reset': async ({ reference }) => {
    const r = await commanderBorne(reference, 'Reset', { type: 'Soft' });
    return r?.status === 'Accepted'
      ? { ok: true, message: 'Reset accepté par la borne.' }
      : { ok: false, message: 'Borne hors ligne — reset non transmis.' };
  },
  '/commands/unlock': async ({ reference, connecteurId }) => {
    const r = await commanderBorne(reference, 'UnlockConnector', { connectorId: connecteurId });
    return r?.status === 'Unlocked'
      ? { ok: true, message: 'Connecteur déverrouillé.' }
      : { ok: false, message: 'Borne hors ligne ou déverrouillage refusé.' };
  },
};

http
  .createServer(async (req, res) => {
    const repondre = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (req.headers['x-ocpp-secret'] !== SECRET) return repondre(401, { message: 'Secret invalide' });

    if (req.method === 'GET' && req.url === '/status') {
      return repondre(200, { bornesConnectees: [...bornes.keys()] });
    }

    const commande = commandes[req.url ?? ''];
    if (req.method !== 'POST' || !commande) return repondre(404, { message: 'Commande inconnue' });

    let corps = '';
    req.on('data', (chunk) => (corps += chunk));
    req.on('end', async () => {
      try {
        const resultat = await commande(JSON.parse(corps || '{}'));
        repondre(resultat.ok ? 200 : 502, { message: resultat.message });
      } catch (err) {
        repondre(500, { message: err.message });
      }
    });
  })
  .listen(HTTP_PORT);

log(`⚡ Serveur OCPP 1.6J : ws://0.0.0.0:${OCPP_PORT}/ocpp/{reference}`);
log(`🛠  API commandes    : http://127.0.0.1:${HTTP_PORT}`);
