export type {
  AvailabilityStatus,
  QuickActionId,
  ShellUser,
} from './components/AsesorShell';
export { AsesorShell } from './components/AsesorShell';
export { useCommandPalette } from './hooks/use-command-palette';
export { useCopilotDrawer } from './hooks/use-copilot-drawer';
export { useSidebarHover } from './hooks/use-sidebar-hover';
export { buildBreadcrumb, getActiveModuleId } from './lib/active-module';
export type { ModuleId } from './lib/nav-items';
export { ALLOWED_ASESOR_ROLES, ASESOR_NAV_ITEMS } from './lib/nav-items';
