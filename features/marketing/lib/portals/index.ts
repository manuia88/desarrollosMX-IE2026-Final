import type { PortalName } from '@/features/marketing/schemas/portals';
import { easybrokerAdapter } from './easybroker';
import { inmuebles24Adapter } from './inmuebles24';
import {
  facebookMarketplaceAdapter,
  icasasAdapter,
  mercadolibreAdapter,
  propiedadesComAdapter,
  vivanunciosAdapter,
} from './stub-adapter';
import type { IPortalAdapter } from './types';

const REGISTRY: Record<PortalName, IPortalAdapter> = {
  inmuebles24: inmuebles24Adapter,
  easybroker: easybrokerAdapter,
  mercadolibre: mercadolibreAdapter,
  vivanuncios: vivanunciosAdapter,
  icasas: icasasAdapter,
  propiedades_com: propiedadesComAdapter,
  facebook_marketplace: facebookMarketplaceAdapter,
};

export function getPortalAdapter(portal: PortalName): IPortalAdapter {
  return REGISTRY[portal];
}

export type {
  IPortalAdapter,
  ParsedLead,
  PublishArgs,
  PublishResult,
  ValidationResult,
} from './types';
