<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Client HTTP vers le serveur OCPP (ocpp-server/, port 9221).
 * Le serveur OCPP relaie ensuite la commande à la borne via WebSocket OCPP 1.6J.
 */
class OcppClient
{
    private function url(string $path): string
    {
        return rtrim(config('services.ocpp.url'), '/').$path;
    }

    /** @return array{ok: bool, message: string} */
    private function post(string $path, array $payload): array
    {
        try {
            $response = Http::timeout(5)
                ->withHeaders(['X-Ocpp-Secret' => config('services.ocpp.secret')])
                ->post($this->url($path), $payload);

            if ($response->successful()) {
                return ['ok' => true, 'message' => $response->json('message') ?? 'Commande envoyée à la borne.'];
            }

            return ['ok' => false, 'message' => $response->json('message') ?? 'La borne a refusé la commande.'];
        } catch (\Throwable) {
            return ['ok' => false, 'message' => 'Serveur OCPP injoignable — commande non transmise.'];
        }
    }

    public function remoteStart(string $reference, int $connecteurId, int $sessionId): array
    {
        return $this->post('/commands/remote-start', [
            'reference' => $reference,
            'connecteurId' => $connecteurId,
            'sessionId' => $sessionId,
        ]);
    }

    public function remoteStop(string $reference, int $sessionId): array
    {
        return $this->post('/commands/remote-stop', [
            'reference' => $reference,
            'sessionId' => $sessionId,
        ]);
    }

    public function reset(string $reference): array
    {
        return $this->post('/commands/reset', ['reference' => $reference]);
    }

    public function unlock(string $reference, int $connecteurId): array
    {
        return $this->post('/commands/unlock', ['reference' => $reference, 'connecteurId' => $connecteurId]);
    }
}
