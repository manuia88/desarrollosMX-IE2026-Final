import { TRPCError } from '@trpc/server';
import type { PortalName } from '@/features/marketing/schemas/portals';
import type {
  IPortalAdapter,
  ParsedLead,
  PublishArgs,
  PublishResult,
  ValidationResult,
} from './types';

// STUB ADR-018 — activar en F14.C.1 (sub-fase portales adicionales) con [dependencia: contracts portal API]
// 4 señales:
// 1) este comentario
// 2) UI badge [próximamente · F14.C.1] en PortalesPublisher para 5 portales STUB
// 3) docs/04_MODULOS/M08_MARKETING.md §Integraciones externas - los 5 portales no marcados real H1
// 4) NOT_IMPLEMENTED 501 (publish throw)

const STUB_MESSAGE = (portal: PortalName) =>
  `Portal ${portal} integration shipping en F14.C.1 sub-fase portales adicionales. ` +
  `H1 reales: inmuebles24 + easybroker.`;

export function makeStubAdapter(portal: PortalName): IPortalAdapter {
  return {
    portal,
    status: 'stub',

    async validateCredentials(credentials): Promise<ValidationResult> {
      const hasAny = Object.keys(credentials).length > 0;
      if (!hasAny) {
        return { valid: false, error: `${portal} requires credentials (sub-fase F14.C.1)` };
      }
      return { valid: true };
    },

    async publish(_args: PublishArgs): Promise<PublishResult> {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: STUB_MESSAGE(portal) });
    },

    parseLeadWebhook(_payload): ParsedLead {
      return {};
    },
  };
}

export const mercadolibreAdapter = makeStubAdapter('mercadolibre');
export const vivanunciosAdapter = makeStubAdapter('vivanuncios');
export const icasasAdapter = makeStubAdapter('icasas');
export const propiedadesComAdapter = makeStubAdapter('propiedades_com');
export const facebookMarketplaceAdapter = makeStubAdapter('facebook_marketplace');
