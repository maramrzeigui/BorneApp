<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Supervision : détection des bornes silencieuses (lancer `php artisan schedule:work` en dev).
Schedule::command('bornes:verifier-heartbeats')->everyMinute();
