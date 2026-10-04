<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Paiement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalletController extends Controller
{
    /**
     * Recharge du wallet. En mode sandbox le crédit est immédiat ; en
     * production ce point d'entrée initiera un paiement carte via un PSP
     * (Konnect / Paymee) et le crédit arrivera par webhook de confirmation.
     */
    public function topup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'montant' => ['required', 'numeric', 'min:1', 'max:1000'],
        ]);

        $montant = round((float) $data['montant'], 2);

        $solde = DB::transaction(function () use ($request, $montant) {
            $user = $request->user();
            $user->increment('solde_wallet', $montant);

            Paiement::create([
                'user_id' => $user->id,
                'montant' => $montant,
                'methode' => 'topup_carte',
                'statut' => 'paye',
                'reference_psp' => 'SANDBOX-'.strtoupper(bin2hex(random_bytes(5))),
            ]);

            return (float) $user->fresh()->solde_wallet;
        });

        AuditLog::record($request->user()->id, 'recharge_wallet', 'user:'.$request->user()->id, "+{$montant}");

        return response()->json(['soldeWallet' => $solde]);
    }

    /** Historique des paiements du client. */
    public function paiements(Request $request): JsonResponse
    {
        $paiements = $request->user()->hasMany(Paiement::class)->orderByDesc('created_at')->limit(50)->get()
            ->map(fn (Paiement $p) => [
                'id' => $p->id,
                'sessionId' => $p->session_recharge_id,
                'montant' => $p->montant,
                'methode' => $p->methode,
                'statut' => $p->statut,
                'date' => $p->created_at->toIso8601String(),
            ]);

        return response()->json($paiements);
    }
}
