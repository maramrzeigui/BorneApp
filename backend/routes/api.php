<?php

use App\Http\Controllers\Api\Admin\AdminBorneController;
use App\Http\Controllers\Api\Admin\AdminExploitationController;
use App\Http\Controllers\Api\Admin\AdminStatsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BorneController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\FactureController;
use App\Http\Controllers\Api\FavoriController;
use App\Http\Controllers\Api\Internal\OcppEventController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\SessionRechargeController;
use App\Http\Controllers\Api\WalletController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // --- Public ---
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/2fa/verify', [AuthController::class, 'verify2fa']);
    Route::post('/auth/forgot', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset', [AuthController::class, 'resetPassword']);

    // --- Client authentifié ---
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        Route::get('/bornes', [BorneController::class, 'index']);
        Route::get('/bornes/{borne}', [BorneController::class, 'show']);

        Route::get('/sessions', [SessionRechargeController::class, 'index']);
        Route::get('/sessions/active', [SessionRechargeController::class, 'active']);
        Route::post('/sessions', [SessionRechargeController::class, 'store']);
        Route::post('/sessions/{session}/stop', [SessionRechargeController::class, 'stop']);
        Route::get('/sessions/{session}/mesures', [SessionRechargeController::class, 'mesures']);

        Route::get('/reservations/active', [ReservationController::class, 'active']);
        Route::post('/reservations', [ReservationController::class, 'store']);
        Route::delete('/reservations/{reservation}', [ReservationController::class, 'destroy']);

        Route::get('/favoris', [FavoriController::class, 'index']);
        Route::post('/favoris/{borne}', [FavoriController::class, 'store']);
        Route::delete('/favoris/{borne}', [FavoriController::class, 'destroy']);

        Route::get('/vehicules', [ClientController::class, 'vehicules']);
        Route::get('/badges', [ClientController::class, 'badges']);
        Route::get('/factures', [ClientController::class, 'factures']);
        Route::get('/factures/{facture}/pdf', [FactureController::class, 'pdf']);
        Route::get('/stats/client', [ClientController::class, 'stats']);

        Route::post('/wallet/topup', [WalletController::class, 'topup']);
        Route::get('/wallet/paiements', [WalletController::class, 'paiements']);
    });

    // --- Back-office (personnel uniquement) ---
    Route::middleware(['auth:sanctum', 'role:super_admin,exploitant,operateur,technicien,service_client,finance'])
        ->prefix('admin')
        ->group(function () {
            Route::get('/stats', [AdminStatsController::class, 'index']);

            Route::get('/bornes', [AdminBorneController::class, 'index']);
            Route::post('/bornes', [AdminBorneController::class, 'store']);
            Route::put('/bornes/{borne}', [AdminBorneController::class, 'update']);
            Route::delete('/bornes/{borne}', [AdminBorneController::class, 'destroy']);
            Route::post('/bornes/{borne}/commande', [AdminBorneController::class, 'commande']);

            Route::get('/sessions', [AdminExploitationController::class, 'sessions']);
            Route::get('/users', [AdminExploitationController::class, 'users']);
            Route::put('/users/{user}', [AdminExploitationController::class, 'updateUser']);
            Route::get('/alertes', [AdminExploitationController::class, 'alertes']);
            Route::put('/alertes/{alerte}/resoudre', [AdminExploitationController::class, 'resoudreAlerte']);
            Route::get('/maintenances', [AdminExploitationController::class, 'maintenances']);
            Route::post('/maintenances', [AdminExploitationController::class, 'storeMaintenance']);
            Route::put('/maintenances/{maintenance}', [AdminExploitationController::class, 'updateMaintenance']);
            Route::get('/audit', [AdminExploitationController::class, 'audit']);
        });

    // --- Interne : événements poussés par le serveur OCPP ---
    Route::middleware('ocpp.secret')->prefix('internal/ocpp')->group(function () {
        Route::post('/boot', [OcppEventController::class, 'boot']);
        Route::post('/heartbeat', [OcppEventController::class, 'heartbeat']);
        Route::post('/status', [OcppEventController::class, 'status']);
        Route::post('/meter-values', [OcppEventController::class, 'meterValues']);
        Route::post('/stop-transaction', [OcppEventController::class, 'stopTransaction']);
    });
});
