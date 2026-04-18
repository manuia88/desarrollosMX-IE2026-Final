import {
  type GenerativeSpec,
  generativeSpecSchema,
} from '@/features/ia-generativa/schemas/generative-spec';
import { ComparisonTable } from './comparison-table';
import { CtaCard } from './cta-card';
import { MiniMap } from './mini-map';
import { StatCard } from './stat-card';
import { Timeline } from './timeline';

function FallbackCard({ message }: { message: string }) {
  return (
    <div className="gen-fallback">
      <strong>Componente inválido</strong>
      <p>{message}</p>
    </div>
  );
}

export function GenerativeComponent({ spec }: { spec: unknown }) {
  const parsed = generativeSpecSchema.safeParse(spec);
  if (!parsed.success) {
    return <FallbackCard message={parsed.error.message.slice(0, 240)} />;
  }
  return <GenerativeComponentTyped spec={parsed.data} />;
}

export function GenerativeComponentTyped({ spec }: { spec: GenerativeSpec }) {
  switch (spec.type) {
    case 'stat_card':
      return <StatCard {...spec} />;
    case 'comparison_table':
      return <ComparisonTable {...spec} />;
    case 'mini_map':
      return <MiniMap {...spec} />;
    case 'timeline':
      return <Timeline {...spec} />;
    case 'cta_card':
      return <CtaCard {...spec} />;
  }
}
