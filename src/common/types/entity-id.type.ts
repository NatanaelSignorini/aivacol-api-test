import { v7 as uuidv7 } from 'uuid';

declare const __brand: unique symbol;

/** Identificador UUID v7 com marca nominal — distinto de `string` no type-checker. */
export type UUIDv7 = string & { readonly [__brand]: 'UUIDv7' };

/** Alias de domínio para chaves primárias e estrangeiras. */
export type EntityId = UUIDv7;

export const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Verifica se string corresponde ao formato UUID v7. */
export function isUuidV7(value: string): value is UUIDv7 {
  return UUID_V7_REGEX.test(value);
}

/**
 * Converte string validada para `UUIDv7`.
 * Use nos boundaries (HTTP, JWT, filas) em vez de casts soltos.
 */
export function toUuidV7(value: string): UUIDv7 {
  if (!isUuidV7(value)) {
    throw new Error(`Invalid UUID v7: "${value}"`);
  }

  return value;
}

/** Gera novo identificador UUID v7 já tipado. */
export function createUuidV7(): UUIDv7 {
  return toUuidV7(uuidv7());
}
