// F14.F.10 Sprint 9 SUB-AGENT 4 — Tests PricingCalculator (presentation pure + computePricingFallback).

import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { computePricingFallback, PricingCalculatorPresentation } from '../PricingCalculator';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

interface RenderedNode {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
  readonly key: string | null;
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

function collectStrings(node: unknown, out: string[] = []): string[] {
  if (node == null || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const c of node) collectStrings(c, out);
    return out;
  }
  if (typeof node === 'object') {
    const n = node as { props?: Record<string, unknown> };
    const children = n.props?.children;
    collectStrings(children, out);
  }
  return out;
}

describe('PricingCalculatorPresentation — render inputs', () => {
  it('renders slider + select with provided videosPerMonth + type values', () => {
    const data = computePricingFallback(50, 20);
    const result = PricingCalculatorPresentation({
      videosPerMonth: 50,
      type: 'todos',
      data,
      onVideosChange: () => undefined,
      onTypeChange: () => undefined,
    }) as unknown as ReactElement;
    const slider = findByDataAttr(result, 'data-testid', 'calc-videos-slider');
    const typeSelect = findByDataAttr(result, 'data-testid', 'calc-type-select');
    expect(slider).not.toBeNull();
    expect(typeSelect).not.toBeNull();
    expect(slider?.props.value).toBe(50);
    expect(typeSelect?.props.value).toBe('todos');
    expect(typeof slider?.props.onChange).toBe('function');
    expect(typeof typeSelect?.props.onChange).toBe('function');
  });
});

describe('computePricingFallback — pure pricing math', () => {
  it('calculates 50 videos with 20% markup → $80.40 total', () => {
    const result = computePricingFallback(50, 20);
    // base $67, 0 extra → studioCost $67 → markup 20% = $13.40 → total $80.40
    expect(result.studioCostUsd).toBe(67);
    expect(result.breakdown.baseFotoPlan).toBe(67);
    expect(result.breakdown.extraVideosUsd).toBe(0);
    expect(result.breakdown.markupAmountUsd).toBe(13.4);
    expect(result.totalClientUsd).toBe(80.4);
    expect(result.markupPct).toBe(20);

    // 100 videos with 20% markup: $67 + 50 * $1.50 = $142, markup 20% = $28.40 → total $170.40
    const r100 = computePricingFallback(100, 20);
    expect(r100.studioCostUsd).toBe(142);
    expect(r100.breakdown.extraVideosUsd).toBe(75);
    expect(r100.totalClientUsd).toBe(170.4);

    // Verify presentation renders the total correctly
    const result200 = computePricingFallback(200, 0);
    const rendered = PricingCalculatorPresentation({
      videosPerMonth: 200,
      type: 'todos',
      data: result200,
      onVideosChange: () => undefined,
      onTypeChange: () => undefined,
    }) as unknown as ReactElement;
    const strings = collectStrings(rendered);
    // 200 videos: $67 + 150 * $1.50 = $292, markup 0% → total $292.00
    expect(strings).toContain('$292.00 USD');
  });
});
