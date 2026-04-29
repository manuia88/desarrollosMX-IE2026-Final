import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('contractsRouter — module export smoke', () => {
  it('exports the 6 expected procedures', async () => {
    const mod = await import('../routes/contracts');
    const r = mod.contractsRouter as unknown as Record<string, unknown>;
    expect(r.generateContract).toBeDefined();
    expect(r.sendForSignature).toBeDefined();
    expect(r.getContractStatus).toBeDefined();
    expect(r.cancelContract).toBeDefined();
    expect(r.getContractAuditTrail).toBeDefined();
    expect(r.listMyContracts).toBeDefined();
  });

  it('exports zod schemas for all inputs', async () => {
    const schemas = await import('../schemas');
    expect(schemas.generateContractInput).toBeDefined();
    expect(schemas.sendForSignatureInput).toBeDefined();
    expect(schemas.getContractStatusInput).toBeDefined();
    expect(schemas.cancelContractInput).toBeDefined();
    expect(schemas.getContractAuditTrailInput).toBeDefined();
    expect(schemas.listMyContractsInput).toBeDefined();
    expect(schemas.contractTypeEnum.parse('aps')).toBe('aps');
    expect(schemas.contractStatusEnum.parse('draft')).toBe('draft');
    expect(schemas.contractProviderEnum.parse('mifiel')).toBe('mifiel');
  });
});

describe('contracts schemas — validation', () => {
  it('rejects too short cancellation reason', async () => {
    const { cancelContractInput } = await import('../schemas');
    const result = cancelContractInput.safeParse({
      contractId: '00000000-0000-0000-0000-000000000000',
      reason: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid generate input with multiple signers', async () => {
    const { generateContractInput } = await import('../schemas');
    const result = generateContractInput.safeParse({
      operacionId: '11111111-1111-4111-8111-111111111111',
      contractType: 'promesa',
      signers: [
        { role: 'comprador', name: 'Juan Perez', email: 'juan@test.com' },
        { role: 'asesor', name: 'Pedro Ruiz', email: 'pedro@test.com' },
      ],
      templateVersion: 'v1',
    });
    if (!result.success) {
      console.error(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('rejects empty signers array', async () => {
    const { generateContractInput } = await import('../schemas');
    const result = generateContractInput.safeParse({
      operacionId: '11111111-1111-4111-8111-111111111111',
      contractType: 'aps',
      signers: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('mifiel/docusign STUBs — ADR-018 4 señales', () => {
  it('mifiel stub returns is_stub=true with STUB_ prefix', async () => {
    const { sendDocumentForSignature } = await import('../../../shared/lib/contracts/mifiel-stub');
    const r = await sendDocumentForSignature({
      contractId: 'cid',
      signers: [{ role: 'comprador', name: 'X', email: 'x@y.com' }],
      pdfUrl: 'http://x',
    });
    expect(r.is_stub).toBe(true);
    expect(r.mifiel_doc_id.startsWith('STUB_MIFIEL_')).toBe(true);
  });

  it('docusign stub returns is_stub=true with STUB_ prefix', async () => {
    const { sendDocumentForSignature } = await import(
      '../../../shared/lib/contracts/docusign-stub'
    );
    const r = await sendDocumentForSignature({
      contractId: 'cid',
      signers: [{ role: 'asesor', name: 'A', email: 'a@b.com' }],
      pdfUrl: 'http://x',
    });
    expect(r.is_stub).toBe(true);
    expect(r.docusign_envelope_id.startsWith('STUB_DOCUSIGN_')).toBe(true);
  });
});
