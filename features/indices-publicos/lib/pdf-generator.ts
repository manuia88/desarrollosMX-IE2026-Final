import { renderToBuffer } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { createElement } from 'react';
import { MethodologyPDF, type MethodologyPDFStrings } from '../components/MethodologyPDF';
import type { IndexCode } from './index-registry-helpers';
import {
  type MethodologyRow,
  parseWeightsJsonb,
  resolveActiveMethodology,
} from './methodology-helpers';

export interface RenderMethodologyPDFInput {
  readonly indexCode: IndexCode;
  readonly versions: ReadonlyArray<MethodologyRow>;
  readonly strings: MethodologyPDFStrings;
  readonly today?: string;
}

export async function renderMethodologyPDF(
  input: RenderMethodologyPDFInput,
): Promise<Buffer | null> {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const active = resolveActiveMethodology(input.versions, today) ?? input.versions[0];
  if (!active) return null;

  const weights = parseWeightsJsonb(active.weights_jsonb);

  const element = createElement(MethodologyPDF, {
    indexCode: input.indexCode,
    active,
    versions: input.versions,
    weights,
    strings: input.strings,
  }) as ReactElement;

  return renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
}
