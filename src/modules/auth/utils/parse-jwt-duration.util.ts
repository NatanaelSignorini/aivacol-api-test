export function parseJwtDurationToSeconds(duration: string): number {
  const trimmed = duration.trim();

  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  const match = trimmed.match(/^(\d+)([smhd])$/i);

  if (!match) {
    return 3600;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const units: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return amount * (units[unit] ?? 3600);
}
