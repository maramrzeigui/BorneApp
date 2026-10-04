<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Borne;
use App\Models\SessionRecharge;
use Illuminate\Http\JsonResponse;

class AdminStatsController extends Controller
{
    /** KPIs réseau (module 15 — tableau de bord). */
    public function index(): JsonResponse
    {
        $terminees = SessionRecharge::where('etat', 'terminee');

        return response()->json([
            'bornesTotal' => Borne::where('source', 'reseau')->count(),
            'bornesActives' => Borne::where('source', 'reseau')->whereIn('etat', ['disponible', 'occupee'])->count(),
            'bornesIndisponibles' => Borne::where('source', 'reseau')->whereIn('etat', ['hors_service', 'maintenance', 'deconnectee', 'defaut'])->count(),
            'sessionsAujourdhui' => SessionRecharge::whereDate('date_debut', today())->count(),
            'caTotal' => (float) (clone $terminees)->sum('prix'),
            'caAujourdhui' => (float) (clone $terminees)->whereDate('date_debut', today())->sum('prix'),
            'kwhTotal' => (float) (clone $terminees)->sum('energie_kwh'),
            'tempsMoyenMinutes' => (int) round(
                ((clone $terminees)->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, date_debut, date_fin)) as m')->value('m')) ?? 0
            ),
        ]);
    }
}
