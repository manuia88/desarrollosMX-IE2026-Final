export const DATA_SOURCES = {
  MX: {
    macro: ['INEGI', 'Banxico', 'SHF', 'Infonavit', 'FOVISSSTE', 'CNBV', 'BBVA Research'],
    geo: [
      'DENUE',
      'FGJ',
      'GTFS',
      'Atlas Riesgos',
      'SIGED',
      'DGIS/CLUES',
      'SACMEX',
      'SEDUVI',
      'Catastro',
    ],
    market: ['Inmuebles24', 'AirDNA', 'Google Trends', 'Cushman MX', 'CBRE MX'],
  },
  CO: {
    macro: ['DANE', 'Banrep', 'FNA', 'Superfinanciera'],
    geo: ['IGAC', 'Catastro Nacional', 'DNP'],
    market: ['Metrocuadrado', 'Fincaraiz', 'Properati'],
  },
  AR: {
    macro: ['INDEC', 'BCRA', 'AFIP', 'Ministerio de Economia'],
    geo: ['ARBA', 'AGIP', 'IDE GCBA'],
    market: ['Zonaprop', 'Argenprop', 'MercadoLibre Inmuebles'],
  },
  BR: {
    macro: ['IBGE', 'BCB', 'FipeZap', 'SECOVI'],
    geo: ['IBGE Malhas', 'IPEA', 'SIDRA'],
    market: ['ZAP', 'VivaReal', 'QuintoAndar'],
  },
  CL: {
    macro: ['INE', 'BCentral', 'ADIMARK', 'SII'],
    geo: ['SII Avaluos', 'MINVU', 'IDE Chile'],
    market: ['Portal Inmobiliario', 'Yapo', 'Enjoy Inmobiliario'],
  },
  US: {
    macro: ['BLS', 'FRED', 'BEA', 'Federal Reserve', 'HUD'],
    geo: ['Census', 'OSM', 'USGS', 'TIGER'],
    market: ['Zillow', 'Redfin', 'Realtor.com'],
  },
} as const;

export type DataSourceCountry = keyof typeof DATA_SOURCES;
export type DataSourceCategory = 'macro' | 'geo' | 'market';

export function getDataSources(country: string, category?: DataSourceCategory): readonly string[] {
  const config = (DATA_SOURCES as Record<string, (typeof DATA_SOURCES)[DataSourceCountry]>)[
    country
  ];
  if (!config) return [];
  if (category) return config[category];
  return [...config.macro, ...config.geo, ...config.market];
}
