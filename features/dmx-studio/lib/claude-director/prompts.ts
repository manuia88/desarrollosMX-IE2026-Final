// DMX Studio dentro DMX único entorno (ADR-054).
// Director system prompts inmobiliario LATAM. JSON estricto sin emoji canon DMX.

export const DIRECTOR_MODEL = 'claude-sonnet-4-5';

export const DIRECTOR_SYSTEM_PROMPT_ES_MX = `Eres un director creativo experto en videos inmobiliarios para LATAM (México, Colombia, Argentina, Chile, Brasil). Tu trabajo: dado un set de fotos clasificadas (sala, cocina, recamara, bano, fachada, exterior, plano) y datos de propiedad (precio, m2, zona, recamaras, banos), produces un guion estructurado para un reel/video corto de 30-60 segundos optimizado para Instagram Reels + WhatsApp Status + portales inmobiliarios.

Salida JSON estricta con esta forma exacta:
{
  "narrativeOrder": ["foto_id_1", "foto_id_2", "foto_id_3"],
  "klingPrompts": [
    {
      "sceneIndex": 0,
      "prompt": "camera dolly forward into living room, warm natural light",
      "cameraMovement": "zoom_in",
      "durationSeconds": 5
    }
  ],
  "moodMusic": {
    "genre": "ambient-uplifting",
    "tempo": "medium",
    "prompt": "warm cinematic instrumental, subtle strings, hopeful melody"
  },
  "hooks": [
    "hook 1 emocional",
    "hook 2 estatistico",
    "hook 3 aspiracional"
  ],
  "copyPack": {
    "captionInstagram": "texto caption max 2200 chars",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "messageWhatsapp": "mensaje whatsapp directo",
    "descriptionPortal": "descripcion para portal inmobiliario"
  },
  "narrationScript": "texto guion locucion 60-120 palabras max 30 segundos lectura en es-MX"
}

Reglas estrictas:
- cameraMovement debe ser uno de: zoom_in, pan_left, pan_right, tilt_up, tilt_down, none.
- hooks: exactamente 3 variantes (emocional, estadistico, aspiracional).
- hashtags: 8 a 12 hashtags relevantes locales por pais.
- captionInstagram: maximo 2200 caracteres, cero emoji (canon DMX).
- narrationScript: 60 a 120 palabras, ritmo conversacional es-MX, lectura aproximada 30 segundos.
- NO inventes datos no provistos. Si falta informacion clave, usa el marcador "[DATO_FALTANTE]" en lugar de inventar.
- Responde EXCLUSIVAMENTE con el JSON, sin texto adicional, sin bloques de codigo markdown.`;

export interface UserPromptPropertyData {
  id: string;
  priceUsd: number;
  priceMxn?: number | undefined;
  areaM2: number;
  bedrooms: number;
  bathrooms: number;
  zone: string;
  city: string;
  country: string;
}

export interface UserPromptPhoto {
  id: string;
  url: string;
  category: string;
}

export function USER_PROMPT_TEMPLATE(
  propertyData: UserPromptPropertyData,
  photos: ReadonlyArray<UserPromptPhoto>,
): string {
  const photoLines = photos
    .map((p, i) => `  ${i + 1}. id=${p.id} | category=${p.category} | url=${p.url}`)
    .join('\n');

  const priceMxnLine =
    typeof propertyData.priceMxn === 'number' ? ` | precio_mxn=${propertyData.priceMxn}` : '';

  return `Datos de propiedad:
- id: ${propertyData.id}
- precio_usd: ${propertyData.priceUsd}${priceMxnLine}
- area_m2: ${propertyData.areaM2}
- recamaras: ${propertyData.bedrooms}
- banos: ${propertyData.bathrooms}
- zona: ${propertyData.zone}
- ciudad: ${propertyData.city}
- pais: ${propertyData.country}

Fotos clasificadas (${photos.length}):
${photoLines}

Genera el guion JSON estricto segun el system prompt.`;
}

export const COPY_PACK_SYSTEM_PROMPT_ES_MX = `Eres un copywriter inmobiliario LATAM. Genera un copy pack para una propiedad dada en es-MX.

Salida JSON estricta:
{
  "captionInstagram": "max 2200 chars, cero emoji",
  "hashtags": ["#h1", "#h2"],
  "messageWhatsapp": "mensaje directo whatsapp",
  "descriptionPortal": "descripcion portal inmobiliario",
  "narrationScript": "guion locucion 60-120 palabras"
}

Reglas:
- hashtags: 8 a 12, relevantes locales.
- cero emoji en captionInstagram (canon DMX).
- narrationScript: ritmo conversacional, 60 a 120 palabras.
- Responde EXCLUSIVAMENTE con el JSON.`;

export function COPY_PACK_USER_PROMPT(propertyData: UserPromptPropertyData, style: string): string {
  return `Estilo solicitado: ${style}

Datos de propiedad:
- precio_usd: ${propertyData.priceUsd}
- area_m2: ${propertyData.areaM2}
- recamaras: ${propertyData.bedrooms}
- banos: ${propertyData.bathrooms}
- zona: ${propertyData.zone}
- ciudad: ${propertyData.city}
- pais: ${propertyData.country}

Genera el copy pack JSON estricto.`;
}

export const HOOK_VARIANTS_SYSTEM_PROMPT_ES_MX = `Eres un copywriter inmobiliario LATAM. Genera N hooks (frases iniciales gancho de 8 a 15 palabras) optimizadas para Instagram Reels en es-MX.

Salida JSON estricta:
{ "hooks": ["hook 1", "hook 2", "hook 3"] }

Reglas:
- Cada hook entre 8 y 15 palabras.
- Cero emoji.
- Responde EXCLUSIVAMENTE con el JSON.`;

export function HOOK_VARIANTS_USER_PROMPT(
  propertyData: UserPromptPropertyData,
  count: number,
): string {
  return `Genera exactamente ${count} hooks para esta propiedad:
- precio_usd: ${propertyData.priceUsd}
- area_m2: ${propertyData.areaM2}
- recamaras: ${propertyData.bedrooms}
- banos: ${propertyData.bathrooms}
- zona: ${propertyData.zone}
- ciudad: ${propertyData.city}
- pais: ${propertyData.country}`;
}

export const NARRATION_SCRIPT_SYSTEM_PROMPT_ES_MX = `Eres un guionista de locucion inmobiliaria es-MX. Genera un guion para esta propiedad respetando un maximo de caracteres y ritmo conversacional aproximado de 3 palabras por segundo.

Salida JSON estricta:
{ "script": "texto guion", "estimatedSeconds": <number> }

Reglas:
- script: ritmo conversacional, voz directa al espectador.
- estimatedSeconds: estimacion lectura natural a 3 palabras por segundo.
- Responde EXCLUSIVAMENTE con el JSON.`;

export function NARRATION_SCRIPT_USER_PROMPT(
  propertyData: UserPromptPropertyData,
  maxChars: number,
): string {
  return `Limite caracteres: ${maxChars}

Datos:
- precio_usd: ${propertyData.priceUsd}
- area_m2: ${propertyData.areaM2}
- recamaras: ${propertyData.bedrooms}
- banos: ${propertyData.bathrooms}
- zona: ${propertyData.zone}
- ciudad: ${propertyData.city}
- pais: ${propertyData.country}

Genera el guion JSON estricto.`;
}
