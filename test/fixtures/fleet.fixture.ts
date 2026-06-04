import { randomInt } from 'node:crypto';

const PLATE_LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';

export function uniqueRunId(): string {
  return `${Date.now()}${randomInt(100, 999)}`;
}

export function uniqueBrandName(runId: string): string {
  return `E2E Brand ${runId}`;
}

export function uniqueModelName(runId: string): string {
  return `E2E Model ${runId}`;
}

function randomPlateLetters(length: number): string {
  let value = '';

  for (let index = 0; index < length; index += 1) {
    value += PLATE_LETTERS[randomInt(0, PLATE_LETTERS.length)];
  }

  return value;
}

export function uniqueVehicleIdentifiers(runId: string): {
  licensePlate: string;
  chassis: string;
  renavam: string;
} {
  const suffix = runId.slice(-7).padStart(7, '0');
  const plateLetters = randomPlateLetters(3);
  const plateDigit = String(randomInt(0, 9));
  const plateLetter = PLATE_LETTERS[randomInt(0, PLATE_LETTERS.length)];
  const plateTail = String(randomInt(10, 99));

  return {
    licensePlate: `${plateLetters}${plateDigit}${plateLetter}${plateTail}`,
    chassis: `9BWZZZ377VT${suffix}`.padEnd(17, '0').slice(0, 17),
    renavam: suffix.padStart(11, '1'),
  };
}

export const AIVACOL_LOGIN = {
  email: 'admin@aivacol.com',
  password: 'Aivacol123!',
} as const;
