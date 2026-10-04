<?php

namespace Database\Seeders;

use App\Models\BadgeRfid;
use App\Models\Borne;
use App\Models\Connecteur;
use App\Models\Facture;
use App\Models\MesureRecharge;
use App\Models\SessionRecharge;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $client = User::create([
            'name' => 'Maram Rzeigui',
            'nom' => 'Rzeigui',
            'prenom' => 'Maram',
            'email' => 'rzprodtn@gmail.com',
            'telephone' => '+216 20 000 000',
            'role' => 'client',
            'solde_wallet' => 45.50,
            'password' => 'password',
        ]);

        User::create([
            'name' => 'Admin BorneApp',
            'nom' => 'Admin',
            'prenom' => 'Super',
            'email' => 'admin@borneapp.tn',
            'role' => 'super_admin',
            'password' => 'password',
        ]);

        $bornes = [
            ['nom' => 'Borne Lac 1', 'reference' => 'BRN-TUN-001', 'numero_serie' => 'SN-88412-A', 'modele' => 'Terra AC W22', 'fabricant' => 'ABB', 'adresse' => 'Rue du Lac Turkana, Les Berges du Lac, Tunis', 'latitude' => 36.8324, 'longitude' => 10.2331, 'version_firmware' => '1.8.2', 'version_ocpp' => '1.6', 'puissance_kw' => 22, 'etat' => 'disponible', 'dernier_heartbeat' => now()->subSeconds(30), 'temperature_c' => 31, 'tarif_kwh' => 0.45,
             'connecteurs' => [['type' => 'Type2', 'puissance_kw' => 22, 'etat' => 'disponible'], ['type' => 'Type2', 'puissance_kw' => 22, 'etat' => 'disponible']]],
            ['nom' => 'Borne Centre Urbain Nord', 'reference' => 'BRN-TUN-002', 'numero_serie' => 'SN-88413-B', 'modele' => 'Supernova 60', 'fabricant' => 'Wallbox', 'adresse' => 'Centre Urbain Nord, Tunis', 'latitude' => 36.8508, 'longitude' => 10.1897, 'version_firmware' => '2.1.0', 'version_ocpp' => '2.0.1', 'puissance_kw' => 60, 'etat' => 'disponible', 'dernier_heartbeat' => now()->subSeconds(12), 'temperature_c' => 38, 'tarif_kwh' => 0.62,
             'connecteurs' => [['type' => 'CCS', 'puissance_kw' => 60, 'etat' => 'disponible'], ['type' => 'CHAdeMO', 'puissance_kw' => 50, 'etat' => 'disponible']]],
            ['nom' => 'Borne La Marsa Plage', 'reference' => 'BRN-TUN-003', 'numero_serie' => 'SN-88414-C', 'modele' => 'Terra 54', 'fabricant' => 'ABB', 'adresse' => 'Avenue Habib Bourguiba, La Marsa', 'latitude' => 36.8781, 'longitude' => 10.3247, 'version_firmware' => '1.7.9', 'version_ocpp' => '1.6', 'puissance_kw' => 50, 'etat' => 'maintenance', 'dernier_heartbeat' => now()->subHour(), 'temperature_c' => 29, 'tarif_kwh' => 0.58,
             'connecteurs' => [['type' => 'CCS', 'puissance_kw' => 50, 'etat' => 'indisponible'], ['type' => 'Type2', 'puissance_kw' => 22, 'etat' => 'indisponible']]],
            ['nom' => 'Borne Sousse Corniche', 'reference' => 'BRN-SOU-001', 'numero_serie' => 'SN-91201-A', 'modele' => 'EVBox Troniq 100', 'fabricant' => 'EVBox', 'adresse' => 'Boulevard de la Corniche, Sousse', 'latitude' => 35.8256, 'longitude' => 10.6084, 'version_firmware' => '3.0.1', 'version_ocpp' => '2.0.1', 'puissance_kw' => 100, 'etat' => 'disponible', 'dernier_heartbeat' => now()->subSeconds(45), 'temperature_c' => 33, 'tarif_kwh' => 0.70,
             'connecteurs' => [['type' => 'CCS', 'puissance_kw' => 100, 'etat' => 'disponible'], ['type' => 'CHAdeMO', 'puissance_kw' => 62, 'etat' => 'disponible']]],
            ['nom' => 'Borne Sfax Centre', 'reference' => 'BRN-SFX-001', 'numero_serie' => 'SN-91355-D', 'modele' => 'Terra AC W7', 'fabricant' => 'ABB', 'adresse' => 'Avenue Hédi Chaker, Sfax', 'latitude' => 34.7406, 'longitude' => 10.7603, 'version_firmware' => '1.8.2', 'version_ocpp' => '1.6', 'puissance_kw' => 7, 'etat' => 'deconnectee', 'dernier_heartbeat' => now()->subDay(), 'temperature_c' => null, 'tarif_kwh' => 0.40,
             'connecteurs' => [['type' => 'AC', 'puissance_kw' => 7, 'etat' => 'indisponible']]],
        ];

        foreach ($bornes as $data) {
            $connecteurs = $data['connecteurs'];
            unset($data['connecteurs']);
            $borne = Borne::create($data);
            foreach ($connecteurs as $conn) {
                Connecteur::create([...$conn, 'borne_id' => $borne->id]);
            }
        }

        $vehicule = Vehicule::create([
            'user_id' => $client->id,
            'marque' => 'Renault',
            'modele' => 'Mégane E-Tech',
            'immatriculation' => '220 TU 4521',
            'type_connecteur' => 'CCS',
            'capacite_batterie_kwh' => 60,
        ]);

        BadgeRfid::create([
            'user_id' => $client->id,
            'uid' => 'A4:5F:22:9C',
            'actif' => true,
            'date_expiration' => '2027-01-01',
        ]);

        // Historique réaliste : [jours avant, heure, borne, prise, kW, batterie début %, batterie fin %, état]
        $historiques = [
            [3, "18:40", 2, 3, 60, 22, 80, "terminee"],
            [9, "08:15", 1, 1, 22, 35, 90, "terminee"],
            [17, "13:05", 4, 7, 100, 18, 80, "terminee"],
            [24, "19:30", 1, 2, 22, 50, 58, "annulee"],
            [33, "10:12", 2, 3, 60, 30, 85, "terminee"],
            [41, "15:05", 4, 7, 100, 12, 80, "terminee"],
            [55, "09:00", 1, 1, 22, 40, 100, "terminee"],
            [70, "17:45", 2, 4, 50, 25, 80, "terminee"],
            [88, "12:20", 4, 8, 62, 20, 75, "terminee"],
            [104, "20:10", 1, 1, 22, 30, 90, "terminee"],
            [130, "11:30", 2, 3, 60, 15, 80, "terminee"],
            [150, "16:00", 4, 7, 100, 20, 80, "terminee"],
        ];

        foreach ($historiques as [$jours, $heure, $borneId, $priseId, $kw, $socDebut, $socFin, $etat]) {
            $debut = now()->subDays($jours)->setTimeFromTimeString($heure);
            $courbe = $this->simulerCourbe($kw, $socDebut, $socFin, $vehicule->capacite_batterie_kwh);
            $energie = end($courbe)["energie"];
            $tarif = Borne::find($borneId)->tarif_kwh;

            $session = SessionRecharge::create([
                "user_id" => $client->id,
                "borne_id" => $borneId,
                "connecteur_id" => $priseId,
                "vehicule_id" => $vehicule->id,
                "date_debut" => $debut,
                "date_fin" => $debut->copy()->addMinutes(count($courbe)),
                "energie_kwh" => $energie,
                "prix" => round($energie * $tarif, 2),
                "pourcentage_batterie" => $socFin,
                "etat" => $etat,
            ]);

            foreach ($courbe as $minute => $point) {
                if ($minute % 2 === 0) {
                    MesureRecharge::create([
                        "session_recharge_id" => $session->id,
                        "horodatage" => $debut->copy()->addMinutes($minute),
                        "energie_kwh" => $point["energie"],
                        "puissance_kw" => $point["puissance"],
                        "pourcentage_batterie" => (int) floor($point["soc"]),
                    ]);
                }
            }

            if ($etat === "terminee") {
                Facture::create([
                    "session_recharge_id" => $session->id,
                    "user_id" => $client->id,
                    "numero" => sprintf("FAC-%s-%04d", $debut->format("Y"), $session->id),
                    "date" => $debut->toDateString(),
                    "montant_ttc" => round($energie * $tarif, 2),
                ]);
            }
        }
    }

    /**
     * Courbe de charge minute par minute : plateau de puissance puis décroissance
     * au-delà de 55 % (DC) ou 95 % (AC), comme sur un véhicule réel.
     *
     * @return list<array{puissance: float, energie: float, soc: float}>
     */
    private function simulerCourbe(int $kwBorne, int $socDebut, int $socFin, int $capacite): array
    {
        $ac = $kwBorne <= 22;
        $soc = $socDebut;
        $energie = 0.0;
        $points = [];

        while ($soc < $socFin && count($points) < 600) {
            $plateau = $kwBorne * ($ac ? 0.95 : 0.92);
            $seuil = $ac ? 95 : 55;
            $puissance = $soc < $seuil ? $plateau : $plateau * max(0.25, 1 - ($soc - $seuil) / 55);
            $puissance *= 0.97 + mt_rand(0, 60) / 1000;

            $energie += $puissance / 60;
            $soc += $puissance / 60 / $capacite * 100;
            $points[] = ["puissance" => round($puissance, 1), "energie" => round($energie, 2), "soc" => min($soc, 100)];
        }

        return $points;
    }
}
