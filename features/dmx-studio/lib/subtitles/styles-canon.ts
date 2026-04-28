// F14.F.6 Sprint 5 BIBLIA UPGRADE 4 — Subtitle styles canon (5 predefined).

export type SubtitleStyleKey = 'cinematic' | 'bold' | 'minimal' | 'quote' | 'yellow_hot';

export interface SubtitleStyle {
  label: string;
  description: string;
  preview: string;
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  outlineColor: string;
  shadowColor?: string;
  alignment: 'bottom_center' | 'bottom_left' | 'middle_center';
  bold: boolean;
  italic: boolean;
  boxColor?: string;
}

export const SUBTITLE_STYLES: Record<SubtitleStyleKey, SubtitleStyle> = {
  cinematic: {
    label: 'Cinematic',
    description: 'Outfit Bold + white + black shadow + bottom center',
    preview: '/studio/subtitles/preview-cinematic.png',
    fontFamily: 'Outfit Bold',
    fontSize: 48,
    primaryColor: '#FFFFFF',
    outlineColor: '#000000',
    shadowColor: '#000000',
    alignment: 'bottom_center',
    bold: true,
    italic: false,
  },
  bold: {
    label: 'Bold',
    description: 'Outfit Black + yellow text + black outline',
    preview: '/studio/subtitles/preview-bold.png',
    fontFamily: 'Outfit Black',
    fontSize: 56,
    primaryColor: '#FFD700',
    outlineColor: '#000000',
    alignment: 'bottom_center',
    bold: true,
    italic: false,
  },
  minimal: {
    label: 'Minimal',
    description: 'DM Sans Regular + white text + no shadow + bottom-left',
    preview: '/studio/subtitles/preview-minimal.png',
    fontFamily: 'DM Sans',
    fontSize: 36,
    primaryColor: '#FFFFFF',
    outlineColor: '#FFFFFF',
    alignment: 'bottom_left',
    bold: false,
    italic: false,
  },
  quote: {
    label: 'Quote',
    description: 'Outfit Italic + cream + thin shadow + center middle',
    preview: '/studio/subtitles/preview-quote.png',
    fontFamily: 'Outfit Italic',
    fontSize: 42,
    primaryColor: '#FFF8E7',
    outlineColor: '#1a1a1a',
    shadowColor: '#1a1a1a',
    alignment: 'middle_center',
    bold: false,
    italic: true,
  },
  yellow_hot: {
    label: 'YellowHot',
    description: 'Outfit Black + yellow #FFD700 + black box BG',
    preview: '/studio/subtitles/preview-yellow-hot.png',
    fontFamily: 'Outfit Black',
    fontSize: 52,
    primaryColor: '#FFD700',
    outlineColor: '#000000',
    boxColor: '#000000',
    alignment: 'bottom_center',
    bold: true,
    italic: false,
  },
};

export function getStyle(key: SubtitleStyleKey): SubtitleStyle {
  return SUBTITLE_STYLES[key];
}

export function buildAssForceStyle(style: SubtitleStyle): string {
  const colorPrimary = hexToAssColor(style.primaryColor);
  const colorOutline = hexToAssColor(style.outlineColor);
  const alignmentCode = mapAlignment(style.alignment);
  const fontName = style.fontFamily.replace(/[ ,']/g, '_');
  return [
    `FontName=${fontName}`,
    `FontSize=${style.fontSize}`,
    `PrimaryColour=${colorPrimary}`,
    `OutlineColour=${colorOutline}`,
    `Bold=${style.bold ? 1 : 0}`,
    `Italic=${style.italic ? 1 : 0}`,
    `Alignment=${alignmentCode}`,
    style.boxColor ? `BackColour=${hexToAssColor(style.boxColor)}` : '',
  ]
    .filter(Boolean)
    .join(',');
}

function mapAlignment(a: SubtitleStyle['alignment']): number {
  if (a === 'bottom_center') return 2;
  if (a === 'bottom_left') return 1;
  return 5;
}

function hexToAssColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);
  return `&H00${b}${g}${r}`;
}
