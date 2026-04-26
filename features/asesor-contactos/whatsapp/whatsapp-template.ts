import type { ContactoSummary } from '../lib/contactos-loader';

export type WhatsAppObjective = 'follow_up' | 'birthday' | 'reengagement' | 'invite_visit';

export interface WhatsAppDraftResult {
  template_md: string;
  url: string;
  fallbackPhone: string | null;
}

const GREETING_BY_OBJECTIVE: Record<WhatsAppObjective, string> = {
  follow_up: '¡Hola {{name}}! Te escribo para retomar la conversación sobre tu búsqueda.',
  birthday: '¡Feliz cumpleaños, {{name}}! 🎉 Te deseo un excelente año.',
  reengagement:
    'Hola {{name}}, hace {{days}} días que no hablamos y quiero saber si sigues buscando opciones.',
  invite_visit: '¡Hola {{name}}! Quiero invitarte a conocer un proyecto que creo que te encaja.',
};

const CTA_BY_OBJECTIVE: Record<WhatsAppObjective, string> = {
  follow_up: '¿Tienes 10 minutos esta semana para una llamada rápida?',
  birthday: 'Cuando estés listo para retomar la búsqueda, aquí estoy para ayudarte.',
  reengagement: '¿Sigue siendo prioridad o pausamos por ahora?',
  invite_visit: '¿Te paso la disponibilidad de visitas para esta semana?',
};

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function normalizePhone(phone: string, defaultCountry = '52'): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  return digits;
}

export function buildWhatsAppDraft(
  contacto: ContactoSummary,
  objective: WhatsAppObjective,
): WhatsAppDraftResult {
  const greeting = GREETING_BY_OBJECTIVE[objective];
  const cta = CTA_BY_OBJECTIVE[objective];
  const filledGreeting = greeting
    .replace('{{name}}', firstName(contacto.contactName))
    .replace('{{days}}', String(contacto.daysSinceLastContact));

  let body = '';
  if (contacto.disc) {
    const dominant = (Object.entries(contacto.disc) as Array<[string, number]>).reduce(
      (acc, current) => (current[1] > acc[1] ? current : acc),
    );
    if (dominant[0] === 'D') {
      body = 'Tengo una opción que entrega valor y rapidez en la decisión.';
    } else if (dominant[0] === 'I') {
      body = 'Tengo una opción que va a encantarte y la quiero compartir contigo.';
    } else if (dominant[0] === 'S') {
      body = 'Encontré una opción estable y de buena planeación que vale la pena revisar.';
    } else {
      body = 'Encontré una opción con números muy claros que vale la pena revisar.';
    }
  } else {
    body = 'Encontré una opción que vale la pena considerar.';
  }

  const template_md = `${filledGreeting}\n\n${body}\n\n${cta}`;
  const fallbackPhone = contacto.contactPhone ?? null;
  const normalized = fallbackPhone ? normalizePhone(fallbackPhone) : '';
  const encoded = encodeURIComponent(template_md);
  const url = normalized ? `https://web.whatsapp.com/send?phone=${normalized}&text=${encoded}` : '';

  return { template_md, url, fallbackPhone };
}
