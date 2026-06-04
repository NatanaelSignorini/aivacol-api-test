import { parseJwtDurationToSeconds } from './parse-jwt-duration.util';

describe('parseJwtDurationToSeconds', () => {
  it('parses plain numeric seconds', () => {
    expect(parseJwtDurationToSeconds('3600')).toBe(3600);
    expect(parseJwtDurationToSeconds(' 900 ')).toBe(900);
  });

  it('parses suffixed durations', () => {
    expect(parseJwtDurationToSeconds('30s')).toBe(30);
    expect(parseJwtDurationToSeconds('5m')).toBe(300);
    expect(parseJwtDurationToSeconds('2h')).toBe(7200);
    expect(parseJwtDurationToSeconds('1d')).toBe(86400);
  });

  it('is case-insensitive for unit suffixes', () => {
    expect(parseJwtDurationToSeconds('2H')).toBe(7200);
    expect(parseJwtDurationToSeconds('15M')).toBe(900);
  });

  it('falls back to one hour for invalid formats', () => {
    expect(parseJwtDurationToSeconds('invalid')).toBe(3600);
    expect(parseJwtDurationToSeconds('10x')).toBe(3600);
    expect(parseJwtDurationToSeconds('')).toBe(3600);
  });
});
