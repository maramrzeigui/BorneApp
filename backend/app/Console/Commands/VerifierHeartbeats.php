<?php

namespace App\Console\Commands;

use App\Models\Alerte;
use App\Models\Borne;
use Illuminate\Console\Command;

/**
 * Marque « déconnectée » toute borne silencieuse depuis plus de 5 minutes
 * et crée l'alerte correspondante (modules 4 et 12).
 * Planifiée toutes les minutes dans routes/console.php.
 */
class VerifierHeartbeats extends Command
{
    protected $signature = 'bornes:verifier-heartbeats';

    protected $description = 'Détecte les bornes qui n\'émettent plus de heartbeat';

    public function handle(): int
    {
        $silencieuses = Borne::where('source', 'reseau')
            ->whereNotIn('etat', ['deconnectee', 'hors_service', 'maintenance'])
            ->where(function ($q) {
                $q->whereNull('dernier_heartbeat')
                    ->orWhere('dernier_heartbeat', '<', now()->subMinutes(5));
            })
            ->get();

        foreach ($silencieuses as $borne) {
            $borne->update(['etat' => 'deconnectee']);

            if (! $borne->alertes()->where('type', 'borne_deconnectee')->where('resolue', false)->exists()) {
                Alerte::create([
                    'borne_id' => $borne->id,
                    'type' => 'borne_deconnectee',
                    'gravite' => 'warning',
                    'message' => "{$borne->nom} n'a plus émis de heartbeat depuis 5 minutes",
                ]);
            }

            $this->info("Borne {$borne->reference} marquée déconnectée.");
        }

        return self::SUCCESS;
    }
}
