// AVM MVP I01 — D7 fingerprint cache lookup.
// Ref: FASE_08 §BLOQUE 8.D.3 step 4.
// Fingerprint = sha256(canonicalInput).slice(0, 16) determinístico.
// Lookup cache: WHERE fingerprint=X AND valid_until>now().

import { createHash } from 'node:crypto';
import type { EstimateRequest } from '@/shared/schemas/avm';

// Canonicaliza input: ordena amenidades (commutatividad) y condiciones keys.
// Todo lo que no afecta el estimate queda fuera para maximizar cache hits.
export function computeFingerprint(input: EstimateRequest): string {
  const amenidadesSorted = [...input.amenidades].sort();
  const condiciones = input.condiciones
    ? Object.fromEntries(Object.entries(input.condiciones).sort(([a], [b]) => a.localeCompare(b)))
    : {};

  const canonical = {
    lat: Number(input.lat.toFixed(5)),
    lng: Number(input.lng.toFixed(5)),
    sup_m2: input.sup_m2,
    recamaras: input.recamaras,
    banos: input.banos,
    amenidades: amenidadesSorted,
    estado_conservacion: input.estado_conservacion,
    tipo_propiedad: input.tipo_propiedad,
    sup_terreno_m2: input.sup_terreno_m2 ?? null,
    medio_banos: input.medio_banos ?? null,
    estacionamientos: input.estacionamientos ?? null,
    edad_anos: input.edad_anos ?? null,
    piso: input.piso ?? null,
    condiciones,
  };

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex').slice(0, 16);
}
