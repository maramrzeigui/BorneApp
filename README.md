# BorneApp 📱⚡

Plateforme complète de recharge de véhicules électriques :

| Dossier | Composant | Techno |
|---|---|---|
| racine | **App mobile client** (iOS / Android / web) | React Native, Expo SDK 54, expo-router |
| [backend/](backend/) | **API REST** | Laravel 13, Sanctum, MySQL 8 |
| [ocpp-server/](ocpp-server/) | **Serveur OCPP 1.6J** + simulateur de borne | Node.js, WebSocket |
| [backoffice/](backoffice/) | **Back-office exploitant** | React 18, Ant Design 5, Vite |

## Lancement (4 terminaux)

```bash
# 1. API Laravel (port 8000)
cd backend && php artisan serve

# 2. Serveur OCPP (ports 9220 WebSocket bornes / 9221 commandes)
cd ocpp-server && npm start
# + une borne simulée qui répond aux commandes et envoie sa télémétrie :
cd ocpp-server && npm run simulate            # simule BRN-TUN-001

# 3. App mobile (scanner le QR code avec Expo Go, ou "w" pour le web)
npx expo start

# 4. Back-office (http://localhost:5173)
cd backoffice && npm run dev
```

Base de données : `php artisan migrate:fresh --seed` dans `backend/` (base MySQL `borneapp`).

Bornes publiques réelles (consultation seule) : `php artisan bornes:importer-publiques`.
Sans clé, la commande interroge OpenStreetMap (peu de bornes recensées en Tunisie). Avec une clé
gratuite Open Charge Map (`OCM_API_KEY` dans `backend/.env`), elle importe un inventaire bien plus complet.

**Après une mise à jour des dépendances natives** (ex. `react-native-svg`, `expo-linear-gradient`),
recompilez l’app de développement : `npx expo run:ios` / `npx expo run:android`.

**Comptes de démonstration**
- Client (app mobile) : `rzprodtn@gmail.com` / `password`
- Admin (back-office) : `admin@borneapp.tn` / `password`

## Fonctionnalités

**App mobile** : inscription/connexion (2FA optionnelle par email, mot de passe oublié),
carte interactive des bornes (Leaflet/OSM), liste + recherche + filtres, fiche borne,
démarrage/arrêt de recharge (relayés en OCPP), suivi temps réel (kWh, kW, batterie —
rafraîchi toutes les 5 s), notification locale de fin de recharge, historique,
wallet rechargeable, factures PDF téléchargeables, véhicules, badges RFID.

**Backend** : auth Sanctum + RBAC (7 rôles), sessions de recharge transactionnelles,
paiement wallet (différé si solde insuffisant), génération de factures PDF (dompdf),
alertes automatiques (surchauffe, déconnexion — `php artisan schedule:work` pour la
détection des heartbeats), journal d'audit, endpoints admin complets.

**Serveur OCPP** : BootNotification, Heartbeat, StatusNotification, Start/StopTransaction,
MeterValues entrants ; RemoteStart/StopTransaction, Reset, UnlockConnector sortants.
Le simulateur (`npm run simulate [REF...]`) se comporte comme une vraie borne.

**Back-office** : dashboard (KPIs réseau, carte, graphiques 14 jours, rafraîchi toutes
les 10 s), CRUD bornes + commandes OCPP, sessions, utilisateurs (rôles), maintenance,
alertes, audit.

## Tests

```bash
cd backend && ./vendor/bin/pest   # 19 tests (auth, 2FA, sessions, paiement, RBAC, OCPP)
npx tsc --noEmit                  # app mobile
cd backoffice && npm run build    # back-office
```

## Notes

- Les codes 2FA / réinitialisation partent dans `backend/storage/logs/laravel.log`
  (MAIL_MAILER=log). Brancher un vrai SMTP en production.
- Le rechargement wallet est en mode **sandbox** (crédit immédiat). Pour la production,
  brancher un PSP (Konnect / Paymee) dans `WalletController`.
- Pour revenir aux données de démonstration embarquées sans backend : `USE_MOCK = true`
  dans [lib/api.ts](lib/api.ts).
