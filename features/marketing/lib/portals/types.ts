import type { PortalCredentials, PortalName } from '@/features/marketing/schemas/portals';

export interface ProjectData {
  id: string;
  nombre?: string | null;
  description?: string | null;
  country_code?: string | null;
  ciudad?: string | null;
  colonia?: string | null;
  units_total?: number | null;
}

export interface PublishArgs {
  project: ProjectData;
  credentials: PortalCredentials;
}

export interface PublishResult {
  externalId: string;
  url?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ParsedLead {
  contactName?: string;
  phone?: string;
  email?: string;
  projectId?: string;
  message?: string;
}

export interface IPortalAdapter {
  readonly portal: PortalName;
  readonly status: 'real' | 'stub';
  publish(args: PublishArgs): Promise<PublishResult>;
  validateCredentials(credentials: PortalCredentials): Promise<ValidationResult>;
  parseLeadWebhook(payload: unknown): ParsedLead;
}
