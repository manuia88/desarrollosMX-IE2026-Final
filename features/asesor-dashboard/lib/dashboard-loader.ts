import 'server-only';
import { createClient } from '@/shared/lib/supabase/server';

export interface DashboardLeadRow {
  id: string;
  full_name: string | null;
  status: string;
  assigned_asesor_id: string | null;
  created_at: string;
  country_code: string;
}

export interface DashboardDealRow {
  id: string;
  lead_id: string | null;
  amount: number | null;
  currency: string | null;
  stage_id: string | null;
  closed_at: string | null;
  created_at: string;
  country_code: string;
}

export interface DashboardOperacionRow {
  id: string;
  deal_id: string | null;
  amount: number | null;
  currency: string | null;
  closed_at: string | null;
  fiscal_status: string | null;
  country_code: string;
}

export interface DashboardSummary {
  leads: DashboardLeadRow[];
  deals: DashboardDealRow[];
  operaciones: DashboardOperacionRow[];
  asesorId: string;
  hasAnyData: boolean;
}

export async function loadDashboardSummary(asesorId: string): Promise<DashboardSummary> {
  const supabase = await createClient();
  const supa = supabase as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (
          c: string,
          v: unknown,
        ) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => {
            limit: (
              n: number,
            ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };

  const [leadsRes, dealsRes, operacionesRes] = await Promise.all([
    supa
      .from('leads')
      .select('id, full_name, status, assigned_asesor_id, created_at, country_code')
      .eq('assigned_asesor_id', asesorId)
      .order('created_at', { ascending: false })
      .limit(20),
    supa
      .from('deals')
      .select('id, lead_id, amount, currency, stage_id, closed_at, created_at, country_code')
      .eq('asesor_id', asesorId)
      .order('created_at', { ascending: false })
      .limit(20),
    supa
      .from('operaciones')
      .select('id, deal_id, amount, currency, closed_at, fiscal_status, country_code')
      .eq('asesor_id', asesorId)
      .order('closed_at', { ascending: false })
      .limit(20),
  ]);

  const leads = (leadsRes.data ?? []) as DashboardLeadRow[];
  const deals = (dealsRes.data ?? []) as DashboardDealRow[];
  const operaciones = (operacionesRes.data ?? []) as DashboardOperacionRow[];

  return {
    leads,
    deals,
    operaciones,
    asesorId,
    hasAnyData: leads.length > 0 || deals.length > 0 || operaciones.length > 0,
  };
}
