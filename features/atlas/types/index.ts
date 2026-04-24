// Shared contracts para Living Atlas (BLOQUE 11.S).
// Wiki colectiva de 200 colonias seeded por Claude Haiku 4.5, renderizada
// con markdown stack unified/remark/rehype (ADR-028).
//
// Persiste en:
//   public.colonia_wiki_entries  — schema existente FASE 11 XL
//   public.zone_slugs            — nueva 11.S.-1 (slug ↔ zone_id)

export const LIVING_ATLAS_METHODOLOGY_HEURISTIC = 'haiku_v1' as const;

export const WIKI_SECTION_KEYS = [
  'intro',
  'historia',
  'caracter',
  'transporte',
  'gastronomia',
  'vida_cultural',
  'seguridad_vida',
  'mercado_inmobiliario',
] as const;

export type WikiSectionKey = (typeof WIKI_SECTION_KEYS)[number];

export interface WikiSection {
  readonly key: WikiSectionKey;
  readonly heading: string;
  readonly content_md: string;
}

export interface WikiEntry {
  readonly id: string;
  readonly colonia_id: string;
  readonly slug: string;
  readonly label: string;
  readonly version: number;
  readonly content_md: string;
  readonly sections: ReadonlyArray<WikiSection>;
  readonly published: boolean;
  readonly reviewed: boolean;
  readonly edited_at: string;
}

export interface AtlasListedColonia {
  readonly slug: string;
  readonly colonia_id: string;
  readonly label: string;
  readonly alcaldia: string | null;
  readonly country_code: string;
}

export interface AtlasPageData {
  readonly entry: WikiEntry;
  readonly similaresHref: string;
  readonly climaGemeloHref: string;
}

export const ATLAS_SIMILAR_INDEX_CODE = 'DMX-LIV' as const;
export const ATLAS_CLIMATE_INDEX_CODE = 'DMX-LIV' as const;

export const ATLAS_SECTION_HEADINGS_BY_LOCALE: Readonly<
  Record<string, Readonly<Record<WikiSectionKey, string>>>
> = Object.freeze({
  'es-MX': Object.freeze({
    intro: 'Introducción',
    historia: 'Historia',
    caracter: 'Carácter',
    transporte: 'Transporte',
    gastronomia: 'Gastronomía',
    vida_cultural: 'Vida cultural',
    seguridad_vida: 'Seguridad y vida diaria',
    mercado_inmobiliario: 'Mercado inmobiliario',
  }),
  'es-CO': Object.freeze({
    intro: 'Introducción',
    historia: 'Historia',
    caracter: 'Carácter',
    transporte: 'Transporte',
    gastronomia: 'Gastronomía',
    vida_cultural: 'Vida cultural',
    seguridad_vida: 'Seguridad y vida diaria',
    mercado_inmobiliario: 'Mercado inmobiliario',
  }),
  'es-AR': Object.freeze({
    intro: 'Introducción',
    historia: 'Historia',
    caracter: 'Carácter',
    transporte: 'Transporte',
    gastronomia: 'Gastronomía',
    vida_cultural: 'Vida cultural',
    seguridad_vida: 'Seguridad y vida diaria',
    mercado_inmobiliario: 'Mercado inmobiliario',
  }),
  'pt-BR': Object.freeze({
    intro: 'Introdução',
    historia: 'História',
    caracter: 'Caráter',
    transporte: 'Transporte',
    gastronomia: 'Gastronomia',
    vida_cultural: 'Vida cultural',
    seguridad_vida: 'Segurança e vida diária',
    mercado_inmobiliario: 'Mercado imobiliário',
  }),
  'en-US': Object.freeze({
    intro: 'Introduction',
    historia: 'History',
    caracter: 'Character',
    transporte: 'Transport',
    gastronomia: 'Food scene',
    vida_cultural: 'Cultural life',
    seguridad_vida: 'Safety and daily life',
    mercado_inmobiliario: 'Real estate market',
  }),
});
