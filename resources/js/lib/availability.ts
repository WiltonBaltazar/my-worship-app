export interface UnavailablePeriod {
  start_date: string;
  end_date: string;
}

export interface AvailabilityFields {
  is_paused?: boolean | null;
  unavailable_dates?: string[] | null;
  unavailable_periods?: UnavailablePeriod[] | null;
}

/** Mirrors Profile::isUnavailableOnDate on the server. Dates are 'yyyy-MM-dd' strings. */
export function isProfileUnavailableOnDate(profile: AvailabilityFields, date?: string | null): boolean {
  if (profile.is_paused) {
    return true;
  }

  if (!date) {
    return false;
  }

  return (profile.unavailable_dates ?? []).includes(date)
    || (profile.unavailable_periods ?? []).some((period) => period.start_date <= date && date <= period.end_date);
}
