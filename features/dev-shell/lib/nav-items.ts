import type { ComponentType, SVGProps } from 'react';
import {
  IconBarChart3,
  IconBuilding2,
  IconLayoutDashboard,
  IconMegaphone,
  IconSettings,
  IconTrendingUp,
  IconUsers,
} from '@/shared/ui/icons/canon-icons';

export type DevModuleId =
  | 'dashboard'
  | 'inventario'
  | 'contabilidad'
  | 'crm-dev'
  | 'marketing-dev'
  | 'analytics-ie'
  | 'ajustes';

export type DevIconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export interface DevNavItem {
  id: DevModuleId;
  labelKey: string;
  Icon: DevIconComponent;
  route: string;
  futurePhase?: string;
  disabled?: boolean;
  badgeKey?: string;
}

export const DEV_NAV_ITEMS: readonly DevNavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'dev.sidebar.dashboard',
    Icon: IconLayoutDashboard,
    route: '/desarrolladores/dashboard',
  },
  {
    id: 'inventario',
    labelKey: 'dev.sidebar.inventario',
    Icon: IconBuilding2,
    route: '/desarrolladores/inventario',
  },
  {
    id: 'crm-dev',
    labelKey: 'dev.sidebar.crm',
    Icon: IconUsers,
    route: '/desarrolladores/crm',
  },
  {
    id: 'marketing-dev',
    labelKey: 'dev.sidebar.marketing',
    Icon: IconMegaphone,
    route: '/desarrolladores/marketing',
  },
  {
    id: 'analytics-ie',
    labelKey: 'dev.sidebar.analytics',
    Icon: IconBarChart3,
    route: '/desarrolladores/analytics',
  },
  {
    id: 'contabilidad',
    labelKey: 'dev.sidebar.contabilidad',
    Icon: IconTrendingUp,
    route: '/desarrolladores/contabilidad',
    futurePhase: 'FASE 16',
    disabled: true,
    badgeKey: 'dev.layout.contabilidadPin',
  },
  {
    id: 'ajustes',
    labelKey: 'dev.sidebar.ajustes',
    Icon: IconSettings,
    route: '/desarrolladores/ajustes',
    futurePhase: 'FASE 15',
    disabled: true,
  },
] as const;

export const ALLOWED_DEV_ROLES = new Set(['admin_desarrolladora', 'superadmin', 'mb_admin']);
