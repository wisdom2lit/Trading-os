export function formatCurrency(value: number, currency: 'USD' | 'EUR' | 'GBP' = 'USD'): string {
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `-${symbol}${abs}` : `${symbol}${abs}`;
}

export function formatSignedCurrency(value: number, currency: 'USD' | 'EUR' | 'GBP' = 'USD'): string {
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value > 0) return `+${symbol}${abs}`;
  if (value < 0) return `-${symbol}${abs}`;
  return `${symbol}0.00`;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatTimeUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(11, 16) + ' UTC';
}
