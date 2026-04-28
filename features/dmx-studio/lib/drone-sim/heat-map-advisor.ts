// F14.F.7 Sprint 6 UPGRADE 8 — Heat map advisor: sugiere pattern óptimo según tipo propiedad.

import { z } from 'zod';

export const PropertyHeatMapInputSchema = z.object({
  propertyType: z.enum(['terreno', 'edificio', 'casa', 'panoramica', 'otro']),
  hasViews: z.boolean().optional(),
  floors: z.number().int().min(0).optional(),
});

export type PropertyHeatMapInput = z.input<typeof PropertyHeatMapInputSchema>;

export interface PatternSuggestion {
  readonly pattern: 'orbital' | 'flyover' | 'approach' | 'reveal';
  readonly reasoning: string;
}

export function suggestPattern(input: PropertyHeatMapInput): PatternSuggestion {
  const parsed = PropertyHeatMapInputSchema.parse(input);

  if (parsed.propertyType === 'terreno') {
    return {
      pattern: 'orbital',
      reasoning:
        'Para un terreno conviene un orbital 360° que muestre el tamaño completo y el contorno del lote desde todos los ángulos.',
    };
  }

  if (parsed.propertyType === 'edificio' && (parsed.floors ?? 0) > 1) {
    return {
      pattern: 'flyover',
      reasoning:
        'Edificio de varios pisos: un flyover top-down recorre la verticalidad y muestra la altura y el contexto urbano.',
    };
  }

  if (parsed.propertyType === 'casa') {
    return {
      pattern: 'approach',
      reasoning:
        'Casa unifamiliar: una aproximación dramática hacia la entrada conecta emocionalmente con el primer momento de "llegar a casa".',
    };
  }

  if (parsed.propertyType === 'panoramica' && parsed.hasViews === true) {
    return {
      pattern: 'reveal',
      reasoning:
        'Propiedad con vistas panorámicas: un reveal que comienza cerrado y abre a la vista crea un efecto wow inmediato.',
    };
  }

  return {
    pattern: 'orbital',
    reasoning:
      'Patrón orbital por defecto: cubre el sujeto desde todos los ángulos sin asumir características específicas de la propiedad.',
  };
}
