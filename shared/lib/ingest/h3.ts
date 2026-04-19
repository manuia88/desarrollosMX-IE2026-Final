import { latLngToCell } from 'h3-js';

// Wrapper centralizado h3-js → resolución 8 (~0.7 km², urban analytics).
// Resolución 9 (~0.1 km², block-level) opcional para micro-zonas.
export function geomToH3R8(lat: number, lng: number): string {
  return latLngToCell(lat, lng, 8);
}

export function geomToH3R9(lat: number, lng: number): string {
  return latLngToCell(lat, lng, 9);
}

// Convierte una geometría WKT POINT(lng lat) o GeoJSON a h3_r8.
// Devuelve null si la geom es inválida o nula.
export function pointToH3R8(point: { lat: number; lng: number } | null | undefined): string | null {
  if (!point) return null;
  if (
    typeof point.lat !== 'number' ||
    typeof point.lng !== 'number' ||
    Number.isNaN(point.lat) ||
    Number.isNaN(point.lng)
  ) {
    return null;
  }
  return geomToH3R8(point.lat, point.lng);
}
