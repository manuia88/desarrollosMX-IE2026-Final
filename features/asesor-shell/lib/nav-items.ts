import type { ComponentType, SVGProps } from 'react';
import {
  IconBarChart3,
  IconBuilding2,
  IconCheckSquare,
  IconGraduationCap,
  IconHome,
  IconLayoutDashboard,
  IconLayoutGrid,
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
  | 'ajustes'
  | 'studio-library'
  | 'studio-usage';

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
    route: '/asesores/dashboard',
    tintToken: '--mod-dashboard',
    group: 'primary',
  },
  {
    id: 'desarrollos',
    labelKey: 'sidebar.items.desarrollos',
    Icon: IconBuilding2,
    route: '/asesores/desarrollos',
    tintToken: '--mod-desarrollos',
    group: 'primary',
  },
  {
    id: 'contactos',
    labelKey: 'sidebar.items.contactos',
    Icon: IconUsers,
    route: '/asesores/contactos',
    tintToken: '--mod-contactos',
    group: 'primary',
  },
  {
    id: 'busquedas',
    labelKey: 'sidebar.items.busquedas',
    Icon: IconSearch,
    route: '/asesores/busquedas',
    tintToken: '--mod-busquedas',
    group: 'primary',
  },
  {
    id: 'captaciones',
    labelKey: 'sidebar.items.captaciones',
    Icon: IconHome,
    route: '/asesores/captaciones',
    tintToken: '--mod-captaciones',
    group: 'primary',
  },
  {
    id: 'tareas',
    labelKey: 'sidebar.items.tareas',
    Icon: IconCheckSquare,
    route: '/asesores/tareas',
    tintToken: '--mod-tareas',
    group: 'primary',
  },
  {
    id: 'operaciones',
    labelKey: 'sidebar.items.operaciones',
    Icon: IconTrendingUp,
    route: '/asesores/operaciones',
    tintToken: '--mod-operaciones',
    group: 'primary',
  },
  {
    id: 'marketing',
    labelKey: 'sidebar.items.marketing',
    Icon: IconMegaphone,
    route: '/asesores/marketing',
    tintToken: '--mod-marketing',
    group: 'primary',
  },
  {
    id: 'estadisticas',
    labelKey: 'sidebar.items.estadisticas',
    Icon: IconBarChart3,
    route: '/asesores/estadisticas',
    tintToken: '--mod-estadisticas',
    group: 'primary',
  },
  {
    id: 'academia',
    labelKey: 'sidebar.items.academia',
    Icon: IconGraduationCap,
    route: '/asesores/academia',
    tintToken: '--mod-academia',
    group: 'secondary',
  },
  {
    id: 'studio-library',
    labelKey: 'sidebar.items.studioLibrary',
    Icon: IconLayoutGrid,
    route: '/studio-app/library',
    tintToken: '--mod-marketing',
    group: 'secondary',
  },
  {
    id: 'studio-usage',
    labelKey: 'sidebar.items.studioUsage',
    Icon: IconBarChart3,
    route: '/studio-app/usage',
    tintToken: '--mod-marketing',
    group: 'secondary',
  },
  {
    id: 'ajustes',
    labelKey: 'sidebar.items.ajustes',
    Icon: IconSettings,
    route: '/asesores/ajustes',
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
