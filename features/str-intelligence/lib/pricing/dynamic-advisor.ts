// Dynamic Pricing Advisor — FASE 07b / BLOQUE 7b.K.
//
// Modelo H1 (linear regression simple) que sugiere pricing diario para los
// próximos N días con base en:
//   - base_adr_minor (ADR observado promedio del market en últimos meses).
//   - day_of_week multiplier (Vie/Sab pico, Dom-Mar bajo).
//   - month seasonality multiplier (curva por país; default MX).
//   - events × distance: para cada fecha, busca eventos del calendar y aplica
//     impact_multiplier. Si event distance ≥ 7 días, decay exponencial.
//   - lead_time_bucket: pricing aumenta a medida que se acerca la fecha
//     (último mes +5%, última semana +10%).
//
// H3 reemplazará este lineal por XGBoost/LSTM con label = revenue actual del
// mes siguiente (ml_training_snapshots de 7b.O).
//
// Pure function: input es el state computado del market + 90 días forward,
// output es array de SuggestedPriceEntry.

export interface CalendarEvent {
  readonly date_from: string; // YYYY-MM-DD
  readonly date_to: string;
  readonly event_name: string;
  readonly impact_multiplier: number;
}

export interface DynamicPricingInput {
  readonly base_adr_minor: number;
  readonly base_occupancy_rate: number; // 0..1
  readonly currency: string;
  readonly start_date: string; // YYYY-MM-DD
  readonly forecast_days: number; // typically 90
  readonly events: readonly CalendarEvent[];
  readonly today_iso?: string;
  // Multipliers by DOW (0=Sun..6=Sat). Default MX urban.
  readonly dow_multipliers?: readonly [number, number, number, number, number, number, number];
  // Multipliers by month index 0-11. Default MX.
  readonly month_multipliers?: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
}

export interface SuggestedPriceEntry {
  readonly date: string;
  readonly suggested_price_minor: number;
  readonly confidence: number; // 0..1
  readonly rationale: {
    readonly base_adr_minor: number;
    readonly dow_multiplier: number;
    readonly month_multiplier: number;
    readonly event_multiplier: number;
    readonly lead_time_multiplier: number;
    readonly event_names: string[];
  };
}

export interface DynamicPricingResult {
  readonly entries: readonly SuggestedPriceEntry[];
  readonly model_version: string;
  readonly currency: string;
}

const DEFAULT_DOW_MULTIPLIERS: [number, number, number, number, number, number, number] = [
  0.85, // Sun
  0.8, // Mon
  0.85, // Tue
  0.9, // Wed
  1.0, // Thu
  1.2, // Fri
  1.25, // Sat
];

const DEFAULT_MONTH_MULTIPLIERS: [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
] = [
  0.9, // Jan
  0.95, // Feb
  1.05, // Mar
  1.05, // Apr
  0.95, // May
  1.0, // Jun
  1.15, // Jul
  1.15, // Aug
  0.95, // Sep
  1.05, // Oct
  1.0, // Nov
  1.2, // Dec
];

function parseISODate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

function formatISODate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayOfWeek(d: Date): number {
  return d.getUTCDay();
}

function monthIndex(d: Date): number {
  return d.getUTCMonth();
}

function eventMultiplierForDate(
  events: readonly CalendarEvent[],
  date: Date,
): { multiplier: number; names: string[] } {
  let multiplier = 1;
  const names: string[] = [];
  const dateMs = date.getTime();
  for (const event of events) {
    const start = parseISODate(event.date_from).getTime();
    const end = parseISODate(event.date_to).getTime();
    if (dateMs >= start && dateMs <= end) {
      multiplier *= event.impact_multiplier;
      names.push(event.event_name);
    } else {
      // Decay exponencial fuera del rango: dentro de ±7 días aplica fracción.
      const distMs = dateMs < start ? start - dateMs : dateMs - end;
      const distDays = distMs / (24 * 3600 * 1000);
      if (distDays > 0 && distDays <= 7) {
        const decay = Math.exp(-distDays / 3);
        multiplier *= 1 + (event.impact_multiplier - 1) * decay;
      }
    }
  }
  return { multiplier, names };
}

function leadTimeMultiplier(date: Date, today: Date): number {
  const distDays = Math.max(0, Math.floor((date.getTime() - today.getTime()) / (24 * 3600 * 1000)));
  if (distDays <= 7) return 1.1;
  if (distDays <= 30) return 1.05;
  return 1.0;
}

function confidenceForDate(date: Date, today: Date): number {
  const distDays = Math.max(0, Math.floor((date.getTime() - today.getTime()) / (24 * 3600 * 1000)));
  // Confidence decae con horizonte: 1.0 dentro de 7d, 0.6 a 90d.
  const c = 1 - (distDays / 90) * 0.4;
  return Math.max(0.3, Math.min(1, Math.round(c * 100) / 100));
}

export function computeDynamicPricing(input: DynamicPricingInput): DynamicPricingResult {
  const dowMultipliers = input.dow_multipliers ?? DEFAULT_DOW_MULTIPLIERS;
  const monthMultipliers = input.month_multipliers ?? DEFAULT_MONTH_MULTIPLIERS;
  const today = input.today_iso ? parseISODate(input.today_iso) : parseISODate(input.start_date);
  const start = parseISODate(input.start_date);

  const entries: SuggestedPriceEntry[] = [];
  for (let i = 0; i < input.forecast_days; i += 1) {
    const date = new Date(start.getTime() + i * 24 * 3600 * 1000);
    const dow = dayOfWeek(date);
    const month = monthIndex(date);
    const dowMul = dowMultipliers[dow] ?? 1;
    const monthMul = monthMultipliers[month] ?? 1;
    const { multiplier: eventMul, names: eventNames } = eventMultiplierForDate(input.events, date);
    const leadMul = leadTimeMultiplier(date, today);

    const suggestedPrice = Math.round(
      input.base_adr_minor * dowMul * monthMul * eventMul * leadMul,
    );

    entries.push({
      date: formatISODate(date),
      suggested_price_minor: suggestedPrice,
      confidence: confidenceForDate(date, today),
      rationale: {
        base_adr_minor: input.base_adr_minor,
        dow_multiplier: Math.round(dowMul * 1000) / 1000,
        month_multiplier: Math.round(monthMul * 1000) / 1000,
        event_multiplier: Math.round(eventMul * 1000) / 1000,
        lead_time_multiplier: Math.round(leadMul * 1000) / 1000,
        event_names: eventNames,
      },
    });
  }

  return {
    entries,
    model_version: 'h1-linear-v1',
    currency: input.currency,
  };
}
