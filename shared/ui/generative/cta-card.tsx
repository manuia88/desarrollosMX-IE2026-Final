import type { z } from 'zod';
import type { ctaCardSpecSchema } from '@/features/ia-generativa/schemas/generative-spec';

type Props = Omit<z.infer<typeof ctaCardSpecSchema>, 'type'>;

export function CtaCard({ title, description, action }: Props) {
  return (
    <div className="gen-cta-card">
      <h3>{title}</h3>
      <p>{description}</p>
      <a href={action.href} className="gen-cta-action">
        {action.label}
      </a>
    </div>
  );
}
