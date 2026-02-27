export const HALF_HOUR_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, '0');
  const minutes = index % 2 === 0 ? '00' : '30';
  const value = `${hours}:${minutes}`;

  return {
    value,
    label: value,
  };
});

export function toLocalDateInputValue(date: Date = new Date()): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - timezoneOffset);

  return localDate.toISOString().slice(0, 10);
}
