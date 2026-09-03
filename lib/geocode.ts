// Turns a zip code into lat/lng coordinates plus the city/state name
// -- this is what lets contractor coverage be "within N miles of my
// shop" instead of a hand-maintained zip list, and lets texts say
// "Miami, FL" instead of a bare zip a contractor might not recognize.
const KEY = process.env.GOOGLE_PLACES_API_KEY;

type GeocodeResult = { lat: number; lng: number; city: string | null; state: string | null };

export async function geocodeZip(zip: string): Promise<GeocodeResult | null> {
  if (!KEY) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&components=country:US&key=${KEY}`
  );
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.[0]) return null;

  const result = data.results[0];
  const loc = result.geometry.location;
  const components: { long_name: string; short_name: string; types: string[] }[] = result.address_components || [];

  const cityComponent =
    components.find((c) => c.types.includes("locality")) ||
    components.find((c) => c.types.includes("postal_town")) ||
    components.find((c) => c.types.includes("sublocality"));
  const stateComponent = components.find((c) => c.types.includes("administrative_area_level_1"));

  return {
    lat: loc.lat,
    lng: loc.lng,
    city: cityComponent?.long_name ?? null,
    state: stateComponent?.short_name ?? null,
  };
}

// Haversine formula -- straight-line ("as the crow flies") distance
// in miles between two points. Not driving distance, but close
// enough for a service-radius check and needs no extra API calls.
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
