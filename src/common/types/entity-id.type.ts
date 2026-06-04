/** Identificador UUID v7 usado como chave primária e estrangeira. */
export type EntityId = string;

export const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Verifica se string corresponde ao formato UUID v7 (versão 7 no nibble de versão). */
export function isUuidV7(value: string): boolean {
  return UUID_V7_REGEX.test(value);
}
