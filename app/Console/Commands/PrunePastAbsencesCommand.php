<?php

namespace App\Console\Commands;

use App\Models\ProfileUnavailableDate;
use App\Models\ProfileUnavailablePeriod;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class PrunePastAbsencesCommand extends Command
{
    protected $signature = 'absences:prune';

    protected $description = 'Delete unavailable dates and periods that are already over';

    public function handle(): int
    {
        // "Over" is judged in the church's timezone, so today's absence survives until tomorrow.
        $today = CarbonImmutable::today('Africa/Maputo')->toDateString();

        $deletedDates = ProfileUnavailableDate::query()
            ->whereDate('unavailable_date', '<', $today)
            ->delete();

        $deletedPeriods = ProfileUnavailablePeriod::query()
            ->whereDate('end_date', '<', $today)
            ->delete();

        $this->info("Removed {$deletedDates} past date(s) and {$deletedPeriods} past period(s).");

        return self::SUCCESS;
    }
}
