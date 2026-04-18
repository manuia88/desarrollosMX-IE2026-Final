// Parser de citations inline en respuestas de IA: [source_type:uuid] o
// [source_type:slug]. Devuelve segmentos para que la UI renderice las
// citations como badges clicables.

export type CitationSegment =
  | { key: string; kind: 'text'; text: string }
  | { key: string; kind: 'citation'; source_type: string; source_id: string; raw: string };

const CITATION_RE = /\[([a-z_][a-z0-9_]*):([a-zA-Z0-9-]{3,64})\]/g;

export function parseCitations(text: string): CitationSegment[] {
  const segments: CitationSegment[] = [];
  let lastIndex = 0;
  let counter = 0;
  text.replace(CITATION_RE, (raw, source_type: string, source_id: string, offset: number) => {
    if (offset > lastIndex) {
      counter += 1;
      segments.push({
        key: `t-${counter}-${offset}`,
        kind: 'text',
        text: text.slice(lastIndex, offset),
      });
    }
    counter += 1;
    segments.push({
      key: `c-${counter}-${raw}`,
      kind: 'citation',
      source_type,
      source_id,
      raw,
    });
    lastIndex = offset + raw.length;
    return raw;
  });
  if (lastIndex < text.length) {
    counter += 1;
    segments.push({
      key: `t-${counter}-${lastIndex}`,
      kind: 'text',
      text: text.slice(lastIndex),
    });
  }
  return segments;
}
