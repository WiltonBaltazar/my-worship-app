<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('notifications:weekly-rehearsal-reminder')
    ->tuesdays()
    ->at('09:00')
    ->timezone('Africa/Maputo')
    ->withoutOverlapping();

Schedule::command('notifications:weekly-duty-reminder')
    ->mondays()
    ->at('09:00')
    ->timezone('Africa/Maputo')
    ->withoutOverlapping();

Schedule::command('notifications:weekly-duty-reminder')
    ->wednesdays()
    ->at('09:00')
    ->timezone('Africa/Maputo')
    ->withoutOverlapping();
