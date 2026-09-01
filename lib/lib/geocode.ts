// Turns a zip code into lat/lng coordinates, and measures distance
// between two points -- this is what lets contractor coverage be
// "within N miles of my shop" instead of a hand-maintained zip list.
const KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function geocodeZip(zip: string): Promise<{ lat: number; lng: number } | null> {
  if (!KEY) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&components=country:US&key=${KEY}`
  );
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.[0]) return null;

  const loc = data.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
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
