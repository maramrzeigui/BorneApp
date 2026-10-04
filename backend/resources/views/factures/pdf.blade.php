<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: DejaVu Sans, sans-serif; color: #1a1a1a; font-size: 13px; }
    .entete { display: table; width: 100%; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #0a7ea4; }
    .numero { text-align: right; color: #555; }
    h1 { font-size: 18px; margin: 20px 0 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
    th { background: #f0f5f7; }
    .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 16px; }
    .pied { margin-top: 50px; font-size: 11px; color: #888; }
  </style>
</head>
<body>
  <div class="entete">
    <div class="logo">⚡ BorneApp</div>
    <div class="numero">
      Facture <strong>{{ $facture->numero }}</strong><br>
      Date : {{ $facture->date->format('d/m/Y') }}
    </div>
  </div>

  <p>
    <strong>Client :</strong> {{ $user->prenom }} {{ $user->nom }}<br>
    {{ $user->email }}
  </p>

  <h1>Détail de la recharge</h1>
  <table>
    <tr><th>Borne</th><th>Connecteur</th><th>Début</th><th>Fin</th><th>Énergie</th><th>Montant TTC</th></tr>
    <tr>
      <td>{{ $session?->borne?->nom ?? '—' }}</td>
      <td>{{ $session?->connecteur?->type ?? '—' }}</td>
      <td>{{ $session?->date_debut?->format('d/m/Y H:i') ?? '—' }}</td>
      <td>{{ $session?->date_fin?->format('d/m/Y H:i') ?? '—' }}</td>
      <td>{{ number_format($session?->energie_kwh ?? 0, 2, ',', ' ') }} kWh</td>
      <td>{{ number_format($facture->montant_ttc, 2, ',', ' ') }} DT</td>
    </tr>
  </table>

  <p class="total">Total TTC : {{ number_format($facture->montant_ttc, 2, ',', ' ') }} DT</p>

  <p class="pied">
    BorneApp — Plateforme de recharge de véhicules électriques.<br>
    Document généré électroniquement, valable sans signature.
  </p>
</body>
</html>
