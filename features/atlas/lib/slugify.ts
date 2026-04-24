// Deterministic kebab-case slugifier para Living Atlas URLs SEO.
// Producción: slug único per colonia (BD UNIQUE constraint). Cuando
// dos labels producen el mismo slug base, el caller debe disambiguar
// via ensureUniqueSlug(base, existingSet).

const MAX_SLUG_LENGTH = 60;

const DIACRITIC_MAP: Readonly<Record<string, string>> = Object.freeze({
  á: 'a',
  à: 'a',
  ä: 'a',
  â: 'a',
  ã: 'a',
  å: 'a',
  é: 'e',
  è: 'e',
  ë: 'e',
  ê: 'e',
  í: 'i',
  ì: 'i',
  ï: 'i',
  î: 'i',
  ó: 'o',
  ò: 'o',
  ö: 'o',
  ô: 'o',
  õ: 'o',
  ú: 'u',
  ù: 'u',
  ü: 'u',
  û: 'u',
  ñ: 'n',
  ç: 'c',
});

function stripDiacritics(input: string): string {
  let out = '';
  for (const ch of input) {
    const lower = ch.toLowerCase();
    const mapped = DIACRITIC_MAP[lower];
    out += mapped ?? lower;
  }
  return out;
}

export function slugify(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return '';
  const normalized = stripDiacritics(input).trim();
  const kebab = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return kebab.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '');
}

export function ensureUniqueSlug(base: string, existing: ReadonlySet<string>): string {
  const normalized = base.length > 0 ? base : 'colonia';
  if (!existing.has(normalized)) return normalized;
  let counter = 2;
  while (true) {
    const candidate = `${normalized}-${counter}`.slice(0, MAX_SLUG_LENGTH);
    if (!existing.has(candidate)) return candidate;
    counter += 1;
    if (counter > 9999) {
      // Safety bail — improbable in praxis; falls back with suffix.
      return `${normalized}-${Date.now()}`.slice(0, MAX_SLUG_LENGTH);
    }
  }
}

export const SLUG_MAX_LENGTH = MAX_SLUG_LENGTH;
