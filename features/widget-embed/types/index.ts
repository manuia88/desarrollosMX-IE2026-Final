// Shared contracts for embeddable widgets (BLOQUE 11.L).
// Widgets son rutas iframe-friendly (/embed/*) que cualquier sitio externo
// puede incrustar con <iframe>. Layout minimal sin header app, CORS permisivo.
//
// Variantes:
//   score        card Bloomberg-style con 15 índices + sparklines
//   pulse        VitalSigns medical-grade dashboard
//   pulse-vs     Pulse Comparador 2 colonias overlay (upgrade L92)

export const WIDGET_VARIANTS = ['score', 'pulse', 'pulse-vs'] as const;
export type WidgetVariant = (typeof WIDGET_VARIANTS)[number];

export const WIDGET_SCOPE_TYPES = ['colonia', 'alcaldia', 'city', 'estado'] as const;
export type WidgetScopeType = (typeof WIDGET_SCOPE_TYPES)[number];

export interface WidgetCustomization {
  readonly theme?: 'light' | 'dark' | 'auto' | undefined;
  readonly locale?: string | undefined;
  readonly ctaUrl?: string | undefined;
}

export interface WidgetEmbedParams {
  readonly variant: WidgetVariant;
  readonly scopeType: WidgetScopeType;
  readonly scopeId: string;
  readonly compareScopeId?: string;
  readonly customization?: WidgetCustomization;
}

export interface WidgetSnippet {
  readonly variant: WidgetVariant;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly html: string;
}
