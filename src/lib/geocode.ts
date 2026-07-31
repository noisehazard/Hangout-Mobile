export type PlaceResult = {
  name: string;
  latitude: number;
  longitude: number;
};

type NominatimRow = { display_name: string; lat: string; lon: string };

const HEADERS = { 'User-Agent': 'HangoutAI/1.0 (dev)' };

export function parseSearchResults(data: NominatimRow[]): PlaceResult[] {
  return data.map((d) => ({
    name: d.display_name,
    latitude: Number(d.lat),
    longitude: Number(d.lon),
  }));
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=` +
    encodeURIComponent(q);
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];
    return parseSearchResults((await res.json()) as NominatimRow[]);
  } catch {
    return [];
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}
