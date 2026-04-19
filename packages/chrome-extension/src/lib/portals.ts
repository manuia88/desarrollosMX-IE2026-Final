import { z } from 'zod';

export const PORTAL_IDS = [
  'inmuebles24',
  'vivanuncios',
  'propiedades_com',
  'ml_inmuebles',
  'fb_marketplace',
] as const;

export const portalIdSchema = z.enum(PORTAL_IDS);
export type PortalId = z.infer<typeof portalIdSchema>;

export const PORTAL_HOSTS: Record<PortalId, string[]> = {
  inmuebles24: ['www.inmuebles24.com'],
  vivanuncios: ['www.vivanuncios.com.mx'],
  propiedades_com: ['propiedades.com', 'www.propiedades.com'],
  ml_inmuebles: ['inmuebles.mercadolibre.com.mx'],
  fb_marketplace: ['www.facebook.com'],
};

export const SOURCE_FOR_PORTAL: Record<PortalId, string> = {
  inmuebles24: 'chrome_ext_inmuebles24',
  vivanuncios: 'chrome_ext_vivanuncios',
  propiedades_com: 'chrome_ext_propiedades_com',
  ml_inmuebles: 'chrome_ext_ml_inmuebles',
  fb_marketplace: 'chrome_ext_fb_marketplace',
};

export function detectPortalForHost(hostname: string): PortalId | null {
  for (const portal of PORTAL_IDS) {
    const hosts = PORTAL_HOSTS[portal];
    if (hosts.includes(hostname)) {
      return portal;
    }
  }
  return null;
}
