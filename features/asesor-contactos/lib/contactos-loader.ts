import 'server-only';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { ContactoStatus, ContactosFilters, DiscScores } from '../schemas/filter-schemas';

export interface ContactoSummary {
  id: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: ContactoStatus;
  qualificationScore: number;
  countryCode: string;
  zoneId: string;
  sourceId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assignedAsesorId: string | null;
  brokerageId: string | null;
  buyerTwinId: string | null;
  disc: DiscScores | null;
  hasFamilyUnit: boolean;
  birthdayInDays: number | null;
  daysSinceLastContact: number;
  metadata: Record<string, unknown>;
}

export interface ContactosLoadResult {
  contactos: ContactoSummary[];
  tabCounts: Record<'all' | 'mine' | 'team' | 'recent', number>;
  statusCounts: Record<ContactoStatus, number>;
  asesorId: string | null;
  isStub: boolean;
  reason: string | null;
}

interface LeadRow {
  id: string;
  user_id: string | null;
  zone_id: string;
  source_id: string;
  country_code: string;
  status: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  assigned_asesor_id: string | null;
  brokerage_id: string | null;
  qualification_score: number | string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface BuyerTwinRow {
  id: string;
  user_id: string;
  disc_profile: unknown;
  big_five_profile: unknown;
}

interface FamilyUnitMember {
  buyer_twin_id: string;
}

function normalizeStatus(raw: string): ContactoStatus {
  if (raw === 'qualified' || raw === 'nurturing' || raw === 'converted' || raw === 'lost') {
    return raw;
  }
  return 'new';
}

function parseDisc(raw: unknown): DiscScores | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  const D = Number(candidate.D ?? candidate.d ?? candidate.dominance ?? 0);
  const I = Number(candidate.I ?? candidate.i ?? candidate.influence ?? 0);
  const S = Number(candidate.S ?? candidate.s ?? candidate.steadiness ?? 0);
  const C = Number(candidate.C ?? candidate.c ?? candidate.compliance ?? 0);
  if (D + I + S + C === 0) return null;
  return { D, I, S, C };
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function birthdayInDaysFromMetadata(metadata: Record<string, unknown> | null): number | null {
  if (!metadata) return null;
  const raw = metadata.birthday ?? metadata.fecha_nacimiento ?? metadata.birthday_md;
  if (typeof raw !== 'string') return null;
  const md = raw.length >= 10 ? raw.slice(5, 10) : raw;
  if (!/^\d{2}-\d{2}$/.test(md)) return null;
  const monthStr = md.slice(0, 2);
  const dayStr = md.slice(3, 5);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (Number.isNaN(month) || Number.isNaN(day)) return null;
  const today = new Date();
  const target = new Date(today.getFullYear(), month - 1, day);
  if (target.getTime() < today.getTime()) {
    target.setFullYear(today.getFullYear() + 1);
  }
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export async function loadContactos(
  filters: ContactosFilters,
  asesorId: string | null,
): Promise<ContactosLoadResult> {
  const supabase = createAdminClient();

  let query = supabase
    .from('leads')
    .select(
      'id, user_id, zone_id, source_id, country_code, status, contact_name, contact_email, contact_phone, assigned_asesor_id, brokerage_id, qualification_score, notes, metadata, created_at, updated_at',
    )
    .order('updated_at', { ascending: false })
    .limit(60);

  if (filters.tab === 'mine' && asesorId) {
    query = query.eq('assigned_asesor_id', asesorId);
  }
  if (filters.tab === 'recent') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    query = query.gte('updated_at', sevenDaysAgo);
  }
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.countryCode) query = query.eq('country_code', filters.countryCode);
  if (filters.q) query = query.ilike('contact_name', `%${filters.q}%`);

  const { data: leadRows } = await query;
  const leads = (leadRows ?? []) as unknown as LeadRow[];

  const tabCounts: ContactosLoadResult['tabCounts'] = {
    all: 0,
    mine: 0,
    team: 0,
    recent: 0,
  };
  const statusCounts: Record<ContactoStatus, number> = {
    new: 0,
    qualified: 0,
    nurturing: 0,
    converted: 0,
    lost: 0,
  };

  const { count: allCount } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true });
  tabCounts.all = allCount ?? 0;

  if (asesorId) {
    const { count: mineCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_asesor_id', asesorId);
    tabCounts.mine = mineCount ?? 0;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { count: recentCount } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .gte('updated_at', sevenDaysAgo);
  tabCounts.recent = recentCount ?? 0;
  tabCounts.team = Math.max(0, tabCounts.all - tabCounts.mine);

  if (leads.length === 0) {
    return {
      contactos: [],
      tabCounts,
      statusCounts,
      asesorId,
      isStub: tabCounts.all === 0,
      reason:
        tabCounts.all === 0
          ? 'BD sin contactos todavía. Crea tu primer contacto o sincroniza desde fuente externa.'
          : null,
    };
  }

  const userIds = leads.map((row) => row.user_id).filter((id): id is string => Boolean(id));
  const buyerTwinsByUser = new Map<string, BuyerTwinRow>();
  if (userIds.length > 0) {
    const { data: twins } = await supabase
      .from('buyer_twins')
      .select('id, user_id, disc_profile, big_five_profile')
      .in('user_id', userIds);
    for (const row of (twins ?? []) as BuyerTwinRow[]) {
      buyerTwinsByUser.set(row.user_id, row);
    }
  }

  const buyerTwinIds = Array.from(buyerTwinsByUser.values()).map((t) => t.id);
  const buyerTwinsInFamilies = new Set<string>();
  if (buyerTwinIds.length > 0) {
    const { data: members } = await supabase
      .from('family_unit_members')
      .select('buyer_twin_id')
      .in('buyer_twin_id', buyerTwinIds);
    for (const row of (members ?? []) as FamilyUnitMember[]) {
      buyerTwinsInFamilies.add(row.buyer_twin_id);
    }
  }

  const contactos: ContactoSummary[] = leads.map((row) => {
    const status = normalizeStatus(row.status);
    statusCounts[status] += 1;
    const twin = row.user_id ? (buyerTwinsByUser.get(row.user_id) ?? null) : null;
    return {
      id: row.id,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      status,
      qualificationScore: Number(row.qualification_score),
      countryCode: row.country_code,
      zoneId: row.zone_id,
      sourceId: row.source_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      assignedAsesorId: row.assigned_asesor_id,
      brokerageId: row.brokerage_id,
      buyerTwinId: twin?.id ?? null,
      disc: parseDisc(twin?.disc_profile ?? null),
      hasFamilyUnit: twin ? buyerTwinsInFamilies.has(twin.id) : false,
      birthdayInDays: birthdayInDaysFromMetadata(row.metadata),
      daysSinceLastContact: daysSince(row.updated_at),
      metadata: row.metadata ?? {},
    };
  });

  return {
    contactos,
    tabCounts,
    statusCounts,
    asesorId,
    isStub: false,
    reason: null,
  };
}
