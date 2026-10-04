<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BorneResource;
use App\Models\Borne;
use App\Models\Reservation;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BorneController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        Reservation::expirerPerimees();

        return BorneResource::collection(Borne::with('connecteurs')->orderBy('nom')->get());
    }

    public function show(Borne $borne): BorneResource
    {
        Reservation::expirerPerimees();

        return new BorneResource($borne->load('connecteurs'));
    }
}
