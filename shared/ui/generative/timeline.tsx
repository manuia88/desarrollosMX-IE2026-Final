import type { z } from 'zod';
import type { timelineSpecSchema } from '@/features/ia-generativa/schemas/generative-spec';

type Props = Omit<z.infer<typeof timelineSpecSchema>, 'type'>;

export function Timeline({ items }: Props) {
  return (
    <ol className="gen-timeline">
      {items.map((it) => (
        <li key={`${it.date}-${it.label.slice(0, 32)}`}>
          <time className="gen-timeline-date">{it.date}</time>
          <span className="gen-timeline-label">{it.label}</span>
        </li>
      ))}
    </ol>
  );
}
