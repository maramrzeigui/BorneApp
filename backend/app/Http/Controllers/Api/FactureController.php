<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Facture;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class FactureController extends Controller
{
    /** Génère et renvoie la facture PDF (module 9 — Factures PDF). */
    public function pdf(Request $request, Facture $facture): Response
    {
        abort_unless($facture->user_id === $request->user()->id, 403);

        $pdf = Pdf::loadView('factures.pdf', [
            'facture' => $facture,
            'user' => $facture->user,
            'session' => \App\Models\SessionRecharge::with(['borne', 'connecteur'])
                ->find($facture->session_recharge_id),
        ]);

        return $pdf->download($facture->numero.'.pdf');
    }
}
