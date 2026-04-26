import { expect, test } from '@playwright/test';
import { createTRPCProxyClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { CrmRouter } from '@/features/crm/routes/crm';

// API-direct E2E — verifica cascade CRM Lead → Deal → close(won) → Operacion.
// Sin browser, sin UI. Auth via service role JWT cuyo claim `role` = 'asesor' o equivalente.
// Tests skip cuando PLAYWRIGHT_TEST_JWT no presente (local dev sin infra).

const TRPC_URL = `${process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'}/api/trpc`;
const HAS_JWT = Boolean(process.env.PLAYWRIGHT_TEST_JWT);
const HAS_ZONE = Boolean(process.env.PLAYWRIGHT_TEST_ZONE_ID);

const created: { leadIds: string[]; dealIds: string[]; operacionIds: string[] } = {
  leadIds: [],
  dealIds: [],
  operacionIds: [],
};

function makeClient() {
  return createTRPCProxyClient<CrmRouter>({
    links: [
      httpBatchLink({
        url: TRPC_URL,
        headers: () => ({ authorization: `Bearer ${process.env.PLAYWRIGHT_TEST_JWT ?? ''}` }),
      }),
    ],
  });
}

test.describe('crm pipeline cascade · Lead → Deal → close(won) → Operacion', () => {
  test.skip(!HAS_JWT, 'PLAYWRIGHT_TEST_JWT env var required for CRM API-direct tests');

  test('end-to-end cascade succeeds (Lead.create → Deal.create → Deal.close → Operacion.list)', async () => {
    test.skip(!HAS_ZONE, 'PLAYWRIGHT_TEST_ZONE_ID required');
    test.setTimeout(60_000);
    const client = makeClient();

    const [sources, stages] = await Promise.all([
      client.catalogs.leadSources.query(),
      client.catalogs.dealStages.query(),
    ]);
    expect((sources as unknown[]).length).toBeGreaterThan(0);
    expect((stages as unknown[]).length).toBeGreaterThan(0);

    const sourceId = (sources as Array<{ id: string }>)[0]?.id;
    const stageList = stages as Array<{ slug: string; id: string }>;
    const prospectingStage = stageList.find((s) => s.slug === 'prospecting');
    const closedWonStage = stageList.find((s) => s.slug === 'closed_won');
    expect(sourceId).toBeDefined();
    expect(prospectingStage).toBeDefined();
    expect(closedWonStage).toBeDefined();

    const zoneId = process.env.PLAYWRIGHT_TEST_ZONE_ID as string;

    const lead = (await client.lead.create.mutate({
      zone_id: zoneId,
      source_id: sourceId as string,
      country_code: 'MX',
      contact_name: `E2E Test Buyer ${Date.now()}`,
      contact_phone: '+525512345678',
    })) as { id: string };
    created.leadIds.push(lead.id);
    expect(lead.id).toMatch(/^[0-9a-f-]{36}$/i);

    const deal = (await client.deal.create.mutate({
      lead_id: lead.id,
      zone_id: zoneId,
      stage_id: (prospectingStage as { id: string }).id,
      amount: 5_000_000,
      amount_currency: 'MXN',
      country_code: 'MX',
      probability: 50,
    })) as { id: string };
    created.dealIds.push(deal.id);
    expect(deal.id).toMatch(/^[0-9a-f-]{36}$/i);

    const closed = (await client.deal.close.mutate({
      deal_id: deal.id,
      outcome: 'won',
    })) as { stage_id: string };
    expect(closed.stage_id).toBe((closedWonStage as { id: string }).id);

    const op = (await client.operacion.create.mutate({
      deal_id: deal.id,
      operacion_type: 'venta',
      amount: 5_000_000,
      amount_currency: 'MXN',
      commission_amount: 250_000,
      commission_currency: 'MXN',
      country_code: 'MX',
    })) as { id: string };
    created.operacionIds.push(op.id);

    const list = (await client.operacion.list.query({
      country_code: 'MX',
      limit: 50,
    })) as Array<{ id: string }>;
    const found = list.some((o) => o.id === op.id);
    expect(found).toBe(true);
  });

  test('deal.close en deal_id inexistente emite TRPCError', async () => {
    const client = makeClient();
    await expect(
      client.deal.close.mutate({
        deal_id: 'a0000000-0000-4000-8000-000000000000',
        outcome: 'won',
      }),
    ).rejects.toBeInstanceOf(TRPCClientError);
  });

  test('buyerTwin.searchSimilar devuelve NOT_IMPLEMENTED (STUB ADR-018 marcado)', async () => {
    const client = makeClient();
    await expect(
      client.buyerTwin.searchSimilar.query({
        buyer_twin_id: 'a0000000-0000-4000-8000-000000000099',
        limit: 5,
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('buyer_twin_similar_stub_fase_13_b_7'),
    });
  });
});

test.afterAll(async () => {
  // Cleanup placeholder: rows creadas via service role REST en B.X RLS hardening.
  // Idempotente — falla silenciosa si infra no disponible.
  void created;
});
