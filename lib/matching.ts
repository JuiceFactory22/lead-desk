import { db } from "./db";
import { milesBetween } from "./geocode";

// Finds active contractors in the right niche whose service radius
// actually reaches the lead's location, closest first, capped to
// `limit` (default 5 per your rule of sending each lead to 3-5
// contractors). Distance-based instead of a maintained zip list --
// a contractor just needs a home zip + radius, not every zip they
// cover.
export async function matchContractors(
  niche: string,
  leadLat: number | null,
  leadLng: number | null,
  limit = 5
) {
  if (leadLat == null || leadLng == null) return [];

  const all = await db.contractor.findMany({ where: { active: true } });
  const nicheKey = niche.trim().toLowerCase();

  const inRange = all
    .filter((c) => {
      const niches = c.niches.split(",").map((n) => n.trim().toLowerCase());
      if (!niches.includes(nicheKey)) return false;
      if (c.lat == null || c.lng == null) return false;
      const distance = milesBetween({ lat: leadLat, lng: leadLng }, { lat: c.lat, lng: c.lng });
      return distance <= c.radiusMiles;
    })
    .map((c) => ({
      contractor: c,
      distance: milesBetween({ lat: leadLat, lng: leadLng }, { lat: c.lat!, lng: c.lng! }),
    }))
    .sort((a, b) => a.distance - b.distance);

  return inRange.slice(0, limit).map((r) => r.contractor);
}
