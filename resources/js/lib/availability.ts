import type { Ministry } from '@/lib/ministry';

/** A null ministry means the absence applies to every ministry. */
export interface UnavailablePeriod {
  start_date: string;
  end_date: string;
  ministry?: Ministry | null;
}

export interface UnavailableDate {
  date: string;
  ministry?: Ministry | null;
}

export interface AvailabilityFields {
  is_paused?: boolean | null;
  pause_ministry?: Ministry | null;
  unavailable_dates?: UnavailableDate[] | null;
  unavailable_periods?: UnavailablePeriod[] | null;
}

function appliesTo(absenceMinistry: Ministry | null | undefined, ministry?: Ministry | null): boolean {
  return !absenceMinistry || !ministry || absenceMinistry === ministry;
}

/**
 * Mirrors Profile::isUnavailableOnDate on the server. Dates are 'yyyy-MM-dd' strings.
 * With a ministry, absences and pauses for the other ministry are ignored.
 */
export function isProfileUnavailableOnDate(
  profile: AvailabilityFields,
  date?: string | null,
  ministry?: Ministry | null,
): boolean {
  if (profile.is_paused && appliesTo(profile.pause_ministry, ministry)) {
    return true;
  }

  if (!date) {
    return false;
  }

  return (profile.unavailable_dates ?? []).some((entry) => entry.date === date && appliesTo(entry.ministry, ministry))
    || (profile.unavailable_periods ?? []).some(
      (period) => period.start_date <= date && date <= period.end_date && appliesTo(period.ministry, ministry),
    );
}
