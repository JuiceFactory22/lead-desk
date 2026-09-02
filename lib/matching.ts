import { db } from "./db";
import { milesBetween } from "./geocode";

const MAX_CONTRACTORS_PER_LEAD = 5;
// How fresh a lead has to be to still get offered to a contractor
// added after the fact. Adjust if 24 hours feels too short or long.
const BACKFILL_WINDOW_HOURS = 24;

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
  limit = MAX_CONTRACTORS_PER_LEAD
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

// Run when a contractor is newly added: catches them up on any
// still-fresh leads (last 24h) in their niche + radius that don't
// already have a full set of contractors, so they show up on a
// lead's page immediately instead of only matching future leads.
export async function backfillContractorIntoRecentLeads(contractor: {
  id: string;
  niches: string;
  lat: number | null;
  lng: number | null;
  radiusMiles: number;
}) {
  if (contractor.lat == null || contractor.lng == null) return 0;

  const since = new Date(Date.now() - BACKFILL_WINDOW_HOURS * 60 * 60 * 1000);
  const niches = contractor.niches.split(",").map((n) => n.trim().toLowerCase());

  const recentLeads = await db.lead.findMany({
    where: { createdAt: { gte: since } },
    include: { claims: true },
  });

  let added = 0;

  for (const lead of recentLeads) {
    if (!niches.includes(lead.niche.trim().toLowerCase())) continue;
    if (lead.lat == null || lead.lng == null) continue;
    if (lead.claims.length >= MAX_CONTRACTORS_PER_LEAD) continue;
    if (lead.claims.some((c) => c.contractorId === contractor.id)) continue;

    const distance = milesBetween({ lat: lead.lat, lng: lead.lng }, { lat: contractor.lat, lng: contractor.lng });
    if (distance > contractor.radiusMiles) continue;

    await db.claim.create({ data: { leadId: lead.id, contractorId: contractor.id } });
    added++;
  }

  return added;
}
