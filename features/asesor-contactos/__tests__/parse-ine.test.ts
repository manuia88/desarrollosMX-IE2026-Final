import { describe, expect, it } from 'vitest';
import { parseBusinessCardText, parseIneText } from '../scan-ocr/parse-ine';

describe('parseIneText', () => {
  it('extracts CURP, fullName, birthdate from typical INE OCR output', () => {
    const text = `INSTITUTO NACIONAL ELECTORAL\nNOMBRE\nJUAN PEREZ LOPEZ\nCURP\nPELJ900215HDFRRN03\nDOMICILIO\nCALLE REFORMA 123 COL CENTRO\nSEXO H`;
    const parsed = parseIneText(text);
    expect(parsed.curp).toBe('PELJ900215HDFRRN03');
    expect(parsed.fullName).toContain('JUAN PEREZ');
    expect(parsed.birthdate).toBe('1990-02-15');
    expect(parsed.address).toContain('REFORMA');
  });

  it('returns nulls when text has no recognizable structure', () => {
    const parsed = parseIneText('hello world');
    expect(parsed.curp).toBeNull();
    expect(parsed.fullName).toBeNull();
    expect(parsed.birthdate).toBeNull();
  });
});

describe('parseBusinessCardText', () => {
  it('extracts email and phone from business card text', () => {
    const text = `Ana García\nDirectora Comercial\nDMX Real Estate\nana@dmx.example\n+52 55 1234 5678`;
    const parsed = parseBusinessCardText(text);
    expect(parsed.email).toBe('ana@dmx.example');
    expect(parsed.phone).toContain('1234');
    expect(parsed.fullName).toBe('Ana García');
  });

  it('returns null fields gracefully on empty text', () => {
    const parsed = parseBusinessCardText('');
    expect(parsed.fullName).toBeNull();
    expect(parsed.email).toBeNull();
    expect(parsed.phone).toBeNull();
  });
});
