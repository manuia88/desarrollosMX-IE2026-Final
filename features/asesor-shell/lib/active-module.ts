import { ASESOR_NAV_ITEMS, type ModuleId } from './nav-items';

export function getActiveModuleId(pathname: string, locale: string): ModuleId | null {
  const localePrefix = `/${locale}`;
  const stripped = pathname.startsWith(localePrefix)
    ? pathname.slice(localePrefix.length)
    : pathname;
  const normalized = stripped === '' ? '/' : stripped;

  for (const item of ASESOR_NAV_ITEMS) {
    if (normalized === item.route || normalized.startsWith(`${item.route}/`)) {
      return item.id;
    }
  }
  return null;
}

export interface BreadcrumbSegment {
  labelKey: string;
  href: string | null;
}

export function buildBreadcrumb(pathname: string, locale: string): BreadcrumbSegment[] {
  const moduleId = getActiveModuleId(pathname, locale);
  const segments: BreadcrumbSegment[] = [];
  if (!moduleId) return segments;
  const item = ASESOR_NAV_ITEMS.find((n) => n.id === moduleId);
  if (!item) return segments;
  segments.push({
    labelKey: `breadcrumb.${item.id}`,
    href: null,
  });
  return segments;
}
