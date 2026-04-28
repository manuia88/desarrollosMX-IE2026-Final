// F14.F.11 Sprint 10 BIBLIA Tarea 10.4 — Tests Feedback UI components.
// 8 tests: NpsWidget render score buttons + comment validation,
//          SatisfactionSurvey STUB ADR-018 compliance,
//          FeedbackAdminDashboard empty state render,
//          InterviewBookingButton aria-disabled + tooltip + STUB compliance.
// (Sin @testing-library/react: invoca componentes presentation puros + traversal árbol.)

import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      sprint10Feedback: {
        submitNps: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
        getNpsAggregate: {
          useQuery: vi.fn(() => ({
            data: undefined,
            isLoading: false,
            error: { data: { code: 'NOT_IMPLEMENTED' }, message: 'NOT_IMPLEMENTED stub' },
          })),
        },
      },
    },
  },
}));

import {
  type FeedbackAdminAggregate,
  FeedbackAdminDashboardPresentation,
} from '../FeedbackAdminDashboard';
import { InterviewBookingButton } from '../InterviewBookingButton';
import { NPS_QUICK_REASONS, NpsWidgetPresentation, tierForScore } from '../NpsWidget';
import { SatisfactionSurvey } from '../SatisfactionSurvey';

interface RenderedNode {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
  readonly key: string | null;
}

function isObject(node: unknown): node is RenderedNode {
  return node != null && typeof node === 'object' && !Array.isArray(node);
}

function findByDataAttr(node: unknown, attr: string, value: string): RenderedNode | null {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const c of node) {
      const f = findByDataAttr(c, attr, value);
      if (f) return f;
    }
    return null;
  }
  const n = node as RenderedNode;
  if (n.props?.[attr] === value) return n;
  return findByDataAttr(n.props?.children, attr, value);
}

function findFirstByPredicate(
  node: unknown,
  predicate: (n: RenderedNode) => boolean,
): RenderedNode | null {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const c of node) {
      const f = findFirstByPredicate(c, predicate);
      if (f) return f;
    }
    return null;
  }
  const n = node as RenderedNode;
  if (predicate(n)) return n;
  return findFirstByPredicate(n.props?.children, predicate);
}

// ---------------------------------------------------------------------------
// NpsWidgetPresentation — render score buttons (0–10) + reasons + tier helper
// ---------------------------------------------------------------------------

describe('NpsWidgetPresentation — score buttons', () => {
  it('renders 11 score buttons (0..10) with proper data-score attribute', () => {
    const tree = NpsWidgetPresentation({
      score: null,
      comment: '',
      selectedReasons: [],
      toastMessage: null,
      toastTone: 'info',
      submitting: false,
      stubH2: false,
      validationError: null,
      onSelectScore: () => undefined,
      onCommentChange: () => undefined,
      onToggleReason: () => undefined,
      onSubmit: () => undefined,
    }) as unknown as ReactElement;

    const buttons: RenderedNode[] = [];
    for (let n = 0; n <= 10; n += 1) {
      const found = findFirstByPredicate(tree, (node) => node.props?.['data-score'] === n);
      if (!found) throw new Error(`missing score button ${n}`);
      buttons.push(found);
    }
    expect(buttons.length).toBe(11);
    expect(buttons.every((b) => typeof b.props.onClick === 'function')).toBe(true);
    expect(buttons[0]?.props['aria-label']).toBe('Puntaje 0');
    expect(buttons[10]?.props['aria-label']).toBe('Puntaje 10');
  });

  it('renders 5 quick reason pills + selected score is reflected in aria-pressed', () => {
    const tree = NpsWidgetPresentation({
      score: 9,
      comment: '',
      selectedReasons: ['Velocidad de generación'],
      toastMessage: null,
      toastTone: 'info',
      submitting: false,
      stubH2: false,
      validationError: null,
      onSelectScore: () => undefined,
      onCommentChange: () => undefined,
      onToggleReason: () => undefined,
      onSubmit: () => undefined,
    }) as unknown as ReactElement;

    expect(NPS_QUICK_REASONS.length).toBe(5);

    const reasonPills = NPS_QUICK_REASONS.map((reason) =>
      findByDataAttr(tree, 'data-reason', reason),
    );
    expect(reasonPills.every((p) => p !== null)).toBe(true);

    const velocityPill = findByDataAttr(tree, 'data-reason', 'Velocidad de generación');
    expect(velocityPill?.props['aria-pressed']).toBe(true);

    const score9 = findFirstByPredicate(tree, (node) => node.props?.['data-score'] === 9);
    expect(score9?.props['aria-pressed']).toBe(true);

    const submitBtn = findByDataAttr(tree, 'data-testid', 'nps-submit');
    expect(submitBtn?.props.disabled).toBe(false);
  });

  it('disables submit when score=null and shows BETA pill when stubH2', () => {
    const treeNoScore = NpsWidgetPresentation({
      score: null,
      comment: '',
      selectedReasons: [],
      toastMessage: null,
      toastTone: 'info',
      submitting: false,
      stubH2: true,
      validationError: null,
      onSelectScore: () => undefined,
      onCommentChange: () => undefined,
      onToggleReason: () => undefined,
      onSubmit: () => undefined,
    }) as unknown as ReactElement;

    const submit = findByDataAttr(treeNoScore, 'data-testid', 'nps-submit');
    expect(submit?.props.disabled).toBe(true);

    // BETA — H2 disclosure pill must be present (stub UI flag).
    const betaPill = findFirstByPredicate(treeNoScore, (n) => {
      if (!isObject(n)) return false;
      const children = n.props.children;
      if (typeof children === 'string') return children.includes('BETA');
      return false;
    });
    expect(betaPill).not.toBeNull();
  });

  it('shows validation error when validationError prop is set', () => {
    const tree = NpsWidgetPresentation({
      score: null,
      comment: '',
      selectedReasons: [],
      toastMessage: null,
      toastTone: 'info',
      submitting: false,
      stubH2: false,
      validationError: 'Selecciona un puntaje del 0 al 10.',
      onSelectScore: () => undefined,
      onCommentChange: () => undefined,
      onToggleReason: () => undefined,
      onSubmit: () => undefined,
    }) as unknown as ReactElement;

    const errorNode = findByDataAttr(tree, 'data-testid', 'nps-validation-error');
    expect(errorNode).not.toBeNull();
    expect(errorNode?.props.role).toBe('alert');
  });
});

describe('tierForScore — NPS canon helper', () => {
  it('classifies detractor 0..6, passive 7..8, promoter 9..10', () => {
    expect(tierForScore(0).tier).toBe('detractor');
    expect(tierForScore(6).tier).toBe('detractor');
    expect(tierForScore(7).tier).toBe('passive');
    expect(tierForScore(8).tier).toBe('passive');
    expect(tierForScore(9).tier).toBe('promoter');
    expect(tierForScore(10).tier).toBe('promoter');
  });
});

// ---------------------------------------------------------------------------
// SatisfactionSurvey — STUB ADR-018 4 señales compliance
// ---------------------------------------------------------------------------

describe('SatisfactionSurvey — STUB ADR-018 compliance', () => {
  it('exposes data-stub + aria-disabled + BETA disclosure on the CTA + tooltip wrapper', () => {
    const tree = SatisfactionSurvey({
      userEmail: 'asesor@example.com',
      daysSinceSignup: 7,
    }) as unknown as ReactElement;

    const cta = findByDataAttr(tree, 'data-testid', 'satisfaction-survey-cta');
    expect(cta).not.toBeNull();
    expect(cta?.props['data-stub']).toBe('adr-018');
    expect(cta?.props['data-stub-feature']).toBe('resend-2week-survey-h2');
    expect(typeof cta?.props['data-stub-reason']).toBe('string');
    expect(cta?.props['aria-disabled']).toBe('true');
    expect(cta?.props.disabled).toBe(true);

    const tooltipWrapper = findByDataAttr(tree, 'data-testid', 'satisfaction-survey-tooltip');
    expect(tooltipWrapper).not.toBeNull();
    expect(typeof tooltipWrapper?.props.title).toBe('string');

    // Container itself flagged as stub for dead-ui auditor.
    const container = findByDataAttr(tree, 'data-testid', 'satisfaction-survey');
    expect(container?.props['data-stub']).toBe('adr-018');
    expect(container?.props['data-stub-feature']).toBe('resend-2week-survey-h2');
  });
});

// ---------------------------------------------------------------------------
// FeedbackAdminDashboardPresentation — empty state when stubH2 / no aggregate
// ---------------------------------------------------------------------------

describe('FeedbackAdminDashboardPresentation — empty state', () => {
  it('renders empty state with CTA copy when stubH2=true (NOT_IMPLEMENTED)', () => {
    const tree = FeedbackAdminDashboardPresentation({
      aggregate: null,
      isLoading: false,
      stubH2: true,
      stubMessage: 'STUB ADR-018 — Sprint 10 NPS data collection paused H1.',
      errorMessage: null,
    }) as unknown as ReactElement;

    const empty = findByDataAttr(tree, 'data-testid', 'feedback-admin-empty-state');
    expect(empty).not.toBeNull();
    expect(empty?.props['data-empty-state']).toBe('true');
  });

  it('renders KPI cards + charts when aggregate data is present', () => {
    const aggregate: FeedbackAdminAggregate = {
      totalResponses: 32,
      npsScore: 56,
      distribution: [
        { score: 0, count: 1, tier: 'detractor' },
        { score: 7, count: 8, tier: 'passive' },
        { score: 9, count: 12, tier: 'promoter' },
        { score: 10, count: 11, tier: 'promoter' },
      ],
      themes: [
        { theme: 'Velocidad', count: 14, tone: 'positive' },
        { theme: 'Copy', count: 6, tone: 'neutral' },
      ],
    };

    const tree = FeedbackAdminDashboardPresentation({
      aggregate,
      isLoading: false,
      stubH2: false,
      stubMessage: null,
      errorMessage: null,
    }) as unknown as ReactElement;

    const loaded = findByDataAttr(tree, 'data-testid', 'feedback-admin-loaded');
    expect(loaded).not.toBeNull();

    const kpiTotal = findByDataAttr(tree, 'data-testid', 'kpi-total-responses');
    expect(kpiTotal).not.toBeNull();
    const kpiNps = findByDataAttr(tree, 'data-testid', 'kpi-nps-score');
    expect(kpiNps).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// InterviewBookingButton — STUB ADR-018 4 señales (aria-disabled + tooltip + pill)
// ---------------------------------------------------------------------------

describe('InterviewBookingButton — STUB ADR-018 compliance', () => {
  it('renders with aria-disabled, data-stub, tooltip wrapper, and BETA disclosure pill', () => {
    const tree = InterviewBookingButton({}) as unknown as ReactElement;

    const wrapper = findByDataAttr(tree, 'data-testid', 'interview-booking-wrapper');
    expect(wrapper).not.toBeNull();
    expect(typeof wrapper?.props.title).toBe('string');
    expect((wrapper?.props.title as string).length).toBeGreaterThan(0);

    const cta = findByDataAttr(tree, 'data-testid', 'interview-booking-cta');
    expect(cta).not.toBeNull();
    expect(cta?.props['aria-disabled']).toBe('true');
    expect(cta?.props.disabled).toBe(true);
    expect(cta?.props['data-stub']).toBe('adr-018');
    expect(cta?.props['data-stub-feature']).toBe('interview-calendly-h2');
    expect(typeof cta?.props['data-stub-reason']).toBe('string');
    expect((cta?.props['data-stub-reason'] as string).length).toBeGreaterThan(20);
    expect(typeof cta?.props['aria-label']).toBe('string');

    const pill = findByDataAttr(tree, 'data-testid', 'interview-booking-pill');
    expect(pill).not.toBeNull();
  });
});
