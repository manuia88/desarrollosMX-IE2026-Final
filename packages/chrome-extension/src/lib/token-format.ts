// Validador puro de formato de token DMX. Sin dependencias chrome.* —
// puede importarse desde tests Node y desde código del extension equivalente.

const TOKEN_REGEX = /^[A-Za-z0-9._-]+$/;

export function isValidTokenFormat(value: string): boolean {
  return value.length >= 32 && value.length <= 512 && TOKEN_REGEX.test(value);
}
