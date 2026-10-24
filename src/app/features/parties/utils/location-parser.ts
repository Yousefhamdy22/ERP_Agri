export interface LatLng {
  latitude: number;
  longitude: number;
}

const COORD_PAIR = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
const URL_PATTERNS = [
  /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
];

export function parseLocationInput(value: string): LatLng | null {
  const v = value.trim();
  if (!v) return null;

  const direct = v.match(COORD_PAIR);
  if (direct) return { latitude: +direct[1], longitude: +direct[2] };

  for (const pattern of URL_PATTERNS) {
    const m = v.match(pattern);
    if (m) return { latitude: +m[1], longitude: +m[2] };
  }

  return null;
}

export function formatLocationInput(latitude?: number | null, longitude?: number | null): string {
  if (latitude == null || longitude == null) return '';
  return `${latitude}, ${longitude}`;
}
