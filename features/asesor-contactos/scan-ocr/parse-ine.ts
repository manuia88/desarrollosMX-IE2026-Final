export interface ParsedIne {
  fullName: string | null;
  curp: string | null;
  birthdate: string | null;
  address: string | null;
}

export interface ParsedBusinessCard {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
}

const CURP_REGEX = /\b[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z\d]\d\b/;
const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.\w{2,}/i;
const PHONE_REGEX = /(\+?\d[\d\s().-]{8,})/;

export function parseIneText(text: string): ParsedIne {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const curpMatch = text.match(CURP_REGEX);
  const curp = curpMatch ? curpMatch[0] : null;

  let fullName: string | null = null;
  for (const line of lines) {
    if (/^(NOMBRE|NAME)/i.test(line)) {
      const next = lines[lines.indexOf(line) + 1];
      if (next) {
        fullName = next;
        break;
      }
    }
  }

  let birthdate: string | null = null;
  if (curp) {
    const yy = curp.slice(4, 6);
    const mm = curp.slice(6, 8);
    const dd = curp.slice(8, 10);
    const yearPrefix = Number(yy) > 30 ? '19' : '20';
    birthdate = `${yearPrefix}${yy}-${mm}-${dd}`;
  }

  let address: string | null = null;
  for (const line of lines) {
    if (/(CALLE|AV\.?|AVENIDA|COL|COLONIA)/i.test(line)) {
      address = line;
      break;
    }
  }

  return { fullName, curp, birthdate, address };
}

export function parseBusinessCardText(text: string): ParsedBusinessCard {
  const emailMatch = text.match(EMAIL_REGEX);
  const phoneMatch = text.match(PHONE_REGEX);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const fullName = lines[0] ?? null;
  const company =
    lines.find(
      (line, idx) => idx > 0 && line.length > 3 && !line.includes('@') && !line.match(PHONE_REGEX),
    ) ?? null;
  return {
    fullName,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0].trim() : null,
    company,
  };
}
