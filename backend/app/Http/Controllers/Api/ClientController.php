<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BadgeRfidResource;
use App\Http\Resources\FactureResource;
use App\Http\Resources\VehiculeResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Ressources du client connecté : véhicules, badges, factures, KPIs. */
class ClientController extends Controller
{
    public function vehicules(Request $request): AnonymousResourceCollection
    {
        return VehiculeResource::collection($request->user()->vehicules);
    }

    public function badges(Request $request): AnonymousResourceCollection
    {
        return BadgeRfidResource::collection($request->user()->badges);
    }

    public function factures(Request $request): AnonymousResourceCollection
    {
        return FactureResource::collection(
            $request->user()->factures()->orderByDesc('date')->get()
        );
    }

    /** Consommation moyenne retenue pour convertir l'énergie en autonomie. */
    private const KWH_AUX_100_KM = 17;

    public function stats(Request $request): JsonResponse
    {
        $terminees = $request->user()->sessions()->where('etat', 'terminee');

        // Six derniers mois, mois vides inclus, pour un graphique continu.
        $parMois = collect(range(5, 0))->map(function (int $recul) use ($terminees) {
            $debut = now()->startOfMonth()->subMonthsNoOverflow($recul);
            $mois = (clone $terminees)->whereBetween('date_debut', [$debut, $debut->copy()->endOfMonth()]);

            return [
                'mois' => $debut->format('Y-m'),
                'kwh' => round((float) (clone $mois)->sum('energie_kwh'), 1),
                'prix' => round((float) (clone $mois)->sum('prix'), 2),
                'sessions' => (clone $mois)->count(),
            ];
        })->values();

        $energie = (float) (clone $terminees)->sum('energie_kwh');

        return response()->json([
            'parMois' => $parMois,
            'kmAjoutes' => (int) round($energie / self::KWH_AUX_100_KM * 100),
            'kwhAux100Km' => self::KWH_AUX_100_KM,
            'sessionsTotal' => (clone $terminees)->count(),
            'energieTotaleKwh' => (float) (clone $terminees)->sum('energie_kwh'),
            'depensesTotal' => (float) (clone $terminees)->sum('prix'),
            'dureeMoyenneMinutes' => (int) round(
                ((clone $terminees)->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, date_debut, date_fin)) as m')->value('m')) ?? 0
            ),
        ]);
    }
}
