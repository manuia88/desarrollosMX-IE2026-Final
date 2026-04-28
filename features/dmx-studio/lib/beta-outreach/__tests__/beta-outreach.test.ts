// F14.F.11 Sprint 10 BIBLIA Tarea 10.3 — Tests beta-outreach STUB ADR-018 + templates.
// Modo A vitest (zero DB, zero JWT). Cubre 4 señales canon + render templates.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TRPCError } from '@trpc/server';
import { describe, expect, it } from 'vitest';
import { renderBetaFeedbackWeek2Html } from '../../resend/templates/beta-feedback-week2';
import { renderBetaInviteInitialHtml } from '../../resend/templates/beta-invite-initial';
import { renderBetaOnboardingDay1Html } from '../../resend/templates/beta-onboarding-day1';
import {
  BETA_OUTREACH_ENABLED,
  getBetaOutreachStatus,
  L_NEW_POINTER,
  L_NEW_POINTER_DESCRIPTION,
  sendBetaInvite,
} from '../index';

describe('beta-outreach STUB ADR-018 (4 señales canon)', () => {
  it('SEÑAL 2: sendBetaInvite throws TRPCError NOT_IMPLEMENTED con message canon', async () => {
    let captured: unknown = null;
    try {
      await sendBetaInvite({
        asesorEmail: 'maria.garcia@example.com',
        asesorName: 'Maria Garcia',
        asesorCity: 'CDMX',
        variant: 'invite_initial',
      });
    } catch (err) {
      captured = err;
    }
    expect(captured).toBeInstanceOf(TRPCError);
    const trpcErr = captured as TRPCError;
    expect(trpcErr.code).toBe('NOT_IMPLEMENTED');
    expect(trpcErr.message).toContain('Beta outreach H2');
    expect(trpcErr.message).toContain('50+ asesores');
    expect(trpcErr.message).toContain(L_NEW_POINTER);
  });

  it('SEÑAL 3: BETA_OUTREACH_ENABLED === false + getBetaOutreachStatus refleja STUB H1', () => {
    expect(BETA_OUTREACH_ENABLED).toBe(false);
    const status = getBetaOutreachStatus();
    expect(status.enabled).toBe(false);
    expect(status.reason).toBe('STUB_ADR_018_H2_FOUNDER_BASE_50_NOT_REACHED');
    expect(status.lNewPointer).toBe(L_NEW_POINTER);
  });

  it('SEÑAL 4: L_NEW_POINTER format correcto + descripcion canonica completa', () => {
    expect(L_NEW_POINTER).toBe('L-NEW-STUDIO-BETA-OUTREACH-ACTIVATE');
    expect(L_NEW_POINTER).toMatch(/^L-NEW-[A-Z0-9-]+$/);
    expect(L_NEW_POINTER_DESCRIPTION.id).toBe(L_NEW_POINTER);
    expect(L_NEW_POINTER_DESCRIPTION.description.length).toBeGreaterThan(40);
    expect(L_NEW_POINTER_DESCRIPTION.activateWhen.length).toBeGreaterThan(40);
    expect(L_NEW_POINTER_DESCRIPTION.activateSteps.length).toBeGreaterThanOrEqual(5);
    // Pasos numerados ordenados.
    L_NEW_POINTER_DESCRIPTION.activateSteps.forEach((step, idx) => {
      expect(step).toMatch(new RegExp(`^${idx + 1}\\.`));
    });
  });
});

describe('beta-outreach templates render canon ADR-050', () => {
  it('Templates render sin errores con props default produce HTML valido', () => {
    const inviteHtml = renderBetaInviteInitialHtml({
      name: 'Maria',
      city: 'CDMX',
    });
    const onboardingHtml = renderBetaOnboardingDay1Html({
      name: 'Maria',
      checkoutUrl: 'https://desarrollosmx.com/studio/checkout/beta-x',
      onboardingGuideUrl: 'https://desarrollosmx.com/studio/onboarding',
    });
    const feedbackHtml = renderBetaFeedbackWeek2Html({
      name: 'Maria',
      surveyUrl: 'https://forms.example.com/survey',
      calendlyUrl: 'https://calendly.com/manu/beta-wrap',
    });

    // HTML doctype + estructura canon.
    for (const html of [inviteHtml, onboardingHtml, feedbackHtml]) {
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<html lang="es">');
      expect(html).toContain('DMX Studio');
      expect(html).toContain('Desarrollos MX');
      // ADR-050 inviolable 1: pill buttons border-radius 9999px.
      expect(html).toContain('border-radius:9999px');
      // ADR-050 inviolable 2: brand gradient principal solo.
      expect(html).toContain('linear-gradient(90deg, #6366F1, #EC4899)');
      // ADR-050 inviolable 3: cero emoji (regex Unicode emoji presence).
      // Excluye: solo strings ASCII printable + acentos basicos.
      expect(html).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
      expect(html).not.toMatch(/[\u{2600}-\u{26FF}]/u);
    }

    // Initial invite contiene founder voice warm + non-pushy markers.
    expect(inviteHtml).toContain('Hola Maria');
    expect(inviteHtml).toContain('Manu');
    expect(inviteHtml).toContain('CDMX');
    // Opt-out explicito.
    expect(inviteHtml).toContain('no te vuelvo a escribir');

    // Onboarding contiene 3 dias estructurados.
    expect(onboardingHtml).toContain('Dia 1');
    expect(onboardingHtml).toContain('Dia 2');
    expect(onboardingHtml).toContain('Dia 3');
    expect(onboardingHtml).toContain('https://desarrollosmx.com/studio/checkout/beta-x');

    // Feedback ofrece 3 opciones cierre (survey + call + WhatsApp).
    expect(feedbackHtml).toContain('https://forms.example.com/survey');
    expect(feedbackHtml).toContain('https://calendly.com/manu/beta-wrap');
    expect(feedbackHtml).toContain('cero friccion');
  });

  it('Templates escape HTML correctamente (XSS guard)', () => {
    const html = renderBetaInviteInitialHtml({
      name: '<script>alert(1)</script>',
      city: 'CDMX & Roma',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('CDMX &amp; Roma');
  });
});

describe('beta-outreach CSV format validation', () => {
  it('INVITE_LIST_TEMPLATE.csv parsea correctamente con header canon + 5 filas ejemplo', () => {
    const csvPath = join(process.cwd(), 'docs/M21_STUDIO/beta-outreach/INVITE_LIST_TEMPLATE.csv');
    const raw = readFileSync(csvPath, 'utf-8');
    const lines = raw.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(6); // 1 header + 5 example rows

    const header = lines[0]?.split(',') ?? [];
    const expectedCols = [
      'email',
      'name',
      'role',
      'city',
      'zonas',
      'priority_score',
      'invitation_status',
      'notes',
    ];
    expect(header).toEqual(expectedCols);

    // Validate first 5 data rows.
    for (let i = 1; i <= 5; i += 1) {
      const row = lines[i];
      expect(row).toBeDefined();
      const cells = row?.split(',') ?? [];
      // Note: notes column contains commas potentially — header count is min.
      expect(cells.length).toBeGreaterThanOrEqual(expectedCols.length);
      // Email column 0 valida formato basico.
      expect(cells[0]).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
      // priority_score (col 5) integer 0-100.
      const score = Number(cells[5]);
      expect(Number.isInteger(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      // invitation_status (col 6) en enum permitido.
      expect(['pending', 'sent', 'accepted', 'declined']).toContain(cells[6]);
    }
  });
});
