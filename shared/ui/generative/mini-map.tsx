import type { z } from 'zod';
import type { miniMapSpecSchema } from '@/features/ia-generativa/schemas/generative-spec';

type Props = Omit<z.infer<typeof miniMapSpecSchema>, 'type'>;

// Placeholder de mapa hasta la integración Mapbox (FASE 08).
export function MiniMap({ center, zoom, markers }: Props) {
  return (
    <div className="gen-mini-map">
      <div className="gen-mini-map-header">
        <strong>Mapa (placeholder)</strong>
        <span>
          centro {center[1].toFixed(3)}, {center[0].toFixed(3)} · zoom {zoom}
        </span>
      </div>
      <ul className="gen-mini-map-list">
        {markers.map((m) => (
          <li key={`${m.lng}-${m.lat}-${m.label ?? ''}`}>
            <span className="gen-mini-map-pin" aria-hidden="true">
              📍
            </span>
            {m.label ?? `${m.lat.toFixed(3)}, ${m.lng.toFixed(3)}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
