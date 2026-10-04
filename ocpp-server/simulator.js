/**
 * Simulateur de borne OCPP 1.6J pour BorneApp.
 *
 * Se connecte au serveur OCPP comme le ferait une vraie borne :
 *   BootNotification → Heartbeat (30 s) → répond aux RemoteStart/Stop,
 *   envoie des MeterValues toutes les 5 s pendant une recharge.
 *
 * Usage :
 *   node simulator.js                     # simule BRN-TUN-001
 *   node simulator.js BRN-TUN-002         # simule une autre borne
 *   node simulator.js BRN-TUN-001 BRN-SOU-001   # plusieurs bornes
 */
import WebSocket from 'ws';

const SERVEUR = process.env.OCPP_URL ?? 'ws://127.0.0.1:9220';
const references = process.argv.slice(2);
if (references.length === 0) references.push('BRN-TUN-001');

const CALL = 2;
const CALLRESULT = 3;

function simulerBorne(reference) {
  const ws = new WebSocket(`${SERVEUR}/ocpp/${reference}`, ['ocpp1.6']);
  const log = (...a) => console.log(`[${reference}]`, ...a);

  let compteur = 0;
  const pending = new Map();
  let recharge = null; // { transactionId, energieWh, timer }

  const call = (action, payload) =>
    new Promise((resolve) => {
      const id = `m${++compteur}`;
      pending.set(id, resolve);
      ws.send(JSON.stringify([CALL, id, action, payload]));
    });

  const demarrerRecharge = async (idTag) => {
    if (recharge) return;
    const { transactionId } = await call('StartTransaction', {
      connectorId: 1,
      idTag,
      meterStart: 0,
      timestamp: new Date().toISOString(),
    });
    recharge = { transactionId, energieWh: 0, soc: 40 + Math.floor(Math.random() * 20) };
    log(`🔋 Recharge démarrée (transaction ${transactionId})`);
    await call('StatusNotification', { connectorId: 1, status: 'Charging', errorCode: 'NoError' });

    recharge.timer = setInterval(async () => {
      // ~50 kW → 50 000 Wh/h → ~70 Wh toutes les 5 s
      recharge.energieWh += 65 + Math.floor(Math.random() * 15);
      recharge.soc = Math.min(100, recharge.soc + 0.2);
      await call('MeterValues', {
        connectorId: 1,
        transactionId: recharge.transactionId,
        meterValue: [
          {
            timestamp: new Date().toISOString(),
            sampledValue: [
              { value: String(recharge.energieWh), measurand: 'Energy.Active.Import.Register', unit: 'Wh' },
              { value: String(48000 + Math.floor(Math.random() * 6000)), measurand: 'Power.Active.Import', unit: 'W' },
              { value: String(Math.floor(recharge.soc)), measurand: 'SoC', unit: 'Percent' },
            ],
          },
        ],
      });
    }, 5000);
  };

  const arreterRecharge = async () => {
    if (!recharge) return;
    clearInterval(recharge.timer);
    await call('StopTransaction', {
      transactionId: recharge.transactionId,
      meterStop: recharge.energieWh,
      timestamp: new Date().toISOString(),
    });
    log(`🛑 Recharge arrêtée (${(recharge.energieWh / 1000).toFixed(2)} kWh)`);
    recharge = null;
    await call('StatusNotification', { connectorId: 1, status: 'Available', errorCode: 'NoError' });
  };

  ws.on('open', async () => {
    log(`connectée à ${SERVEUR}`);
    await call('BootNotification', {
      chargePointVendor: 'BorneApp Simulateur',
      chargePointModel: 'SIM-1',
      firmwareVersion: 'sim-1.0.0',
    });
    await call('StatusNotification', { connectorId: 1, status: 'Available', errorCode: 'NoError' });
    setInterval(() => call('Heartbeat', {}), 30_000);
  });

  ws.on('message', async (raw) => {
    const frame = JSON.parse(raw.toString());
    const [type, id, actionOuPayload, payload] = frame;

    if (type === CALLRESULT) {
      pending.get(id)?.(actionOuPayload);
      pending.delete(id);
      return;
    }

    if (type !== CALL) return;
    const action = actionOuPayload;

    // Commandes reçues du serveur central
    if (action === 'RemoteStartTransaction') {
      ws.send(JSON.stringify([CALLRESULT, id, { status: 'Accepted' }]));
      await demarrerRecharge(payload.idTag);
    } else if (action === 'RemoteStopTransaction') {
      ws.send(JSON.stringify([CALLRESULT, id, { status: 'Accepted' }]));
      await arreterRecharge();
    } else if (action === 'Reset') {
      ws.send(JSON.stringify([CALLRESULT, id, { status: 'Accepted' }]));
      log('♻️  Reset demandé — redémarrage simulé');
      await arreterRecharge();
    } else if (action === 'UnlockConnector') {
      ws.send(JSON.stringify([CALLRESULT, id, { status: 'Unlocked' }]));
    } else {
      ws.send(JSON.stringify([CALLRESULT, id, {}]));
    }
  });

  ws.on('close', () => log('déconnectée'));
  ws.on('error', (e) => log('erreur :', e.message));
}

references.forEach(simulerBorne);
