import type { ComponentType, SVGProps } from 'react';
import {
  IconBarChart3,
  IconBuilding2,
  IconCheckSquare,
  IconGraduationCap,
  IconHome,
  IconLayoutDashboard,
  IconMegaphone,
  IconSearch,
  IconSettings,
  IconTrendingUp,
  IconUsers,
} from '@/shared/ui/icons/canon-icons';

export type ModuleId =
  | 'dashboard'
  | 'desarrollos'
  | 'contactos'
  | 'busquedas'
  | 'captaciones'
  | 'tareas'
  | 'operaciones'
  | 'marketing'
  | 'estadisticas'
  | 'academia'
  | 'ajustes';

export type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export interface AsesorNavItem {
  id: ModuleId;
  labelKey: string;
  Icon: IconComponent;
  route: string;
  tintToken: string;
  group: 'primary' | 'secondary';
}

export const ASESOR_NAV_ITEMS: readonly AsesorNavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'sidebar.items.dashboard',
    Icon: IconLayoutDashboard,
    route: '/dashboard',
    tintToken: '--mod-dashboard',
    group: 'primary',
  },
  {
    id: 'desarrollos',
    labelKey: 'sidebar.items.desarrollos',
    Icon: IconBuilding2,
    route: '/desarrollos',
    tintToken: '--mod-desarrollos',
    group: 'primary',
  },
  {
    id: 'contactos',
    labelKey: 'sidebar.items.contactos',
    Icon: IconUsers,
    route: '/contactos',
    tintToken: '--mod-contactos',
    group: 'primary',
  },
  {
    id: 'busquedas',
    labelKey: 'sidebar.items.busquedas',
    Icon: IconSearch,
    route: '/busquedas',
    tintToken: '--mod-busquedas',
    group: 'primary',
  },
  {
    id: 'captaciones',
    labelKey: 'sidebar.items.captaciones',
    Icon: IconHome,
    route: '/captaciones',
    tintToken: '--mod-captaciones',
    group: 'primary',
  },
  {
    id: 'tareas',
    labelKey: 'sidebar.items.tareas',
    Icon: IconCheckSquare,
    route: '/tareas',
    tintToken: '--mod-tareas',
    group: 'primary',
  },
  {
    id: 'operaciones',
    labelKey: 'sidebar.items.operaciones',
    Icon: IconTrendingUp,
    route: '/operaciones',
    tintToken: '--mod-operaciones',
    group: 'primary',
  },
  {
    id: 'marketing',
    labelKey: 'sidebar.items.marketing',
    Icon: IconMegaphone,
    route: '/marketing',
    tintToken: '--mod-marketing',
    group: 'primary',
  },
  {
    id: 'estadisticas',
    labelKey: 'sidebar.items.estadisticas',
    Icon: IconBarChart3,
    route: '/estadisticas',
    tintToken: '--mod-estadisticas',
    group: 'primary',
  },
  {
    id: 'academia',
    labelKey: 'sidebar.items.academia',
    Icon: IconGraduationCap,
    route: '/academia',
    tintToken: '--mod-academia',
    group: 'secondary',
  },
  {
    id: 'ajustes',
    labelKey: 'sidebar.items.ajustes',
    Icon: IconSettings,
    route: '/ajustes',
    tintToken: '--canon-cream-2',
    group: 'secondary',
  },
] as const;

export const ALLOWED_ASESOR_ROLES = new Set([
  'asesor',
  'admin_desarrolladora',
  'broker_manager',
  'mb_admin',
  'mb_coordinator',
]);
