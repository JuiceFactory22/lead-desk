import { db } from "./db";
import { milesBetween } from "./geocode";

const MAX_CONTRACTORS_PER_LEAD = 5;
const BACKFILL_WINDOW_HOURS = 24;

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

// Newest-first, so the caller can create claims for every matching
// recent lead (visible on each lead's page) while only auto-texting
// about the single most recent one -- catching a contractor up on a
// whole backlog of leads at once via separate texts reads as spam.
export async function backfillContractorIntoRecentLeads(contractor: {
  id: string;
  niches: string;
  lat: number | null;
  lng: number | null;
  radiusMiles: number;
}): Promise<string[]> {
  if (contractor.lat == null || contractor.lng == null) return [];

  const since = new Date(Date.now() - BACKFILL_WINDOW_HOURS * 60 * 60 * 1000);
  const niches = contractor.niches.split(",").map((n) => n.trim().toLowerCase());

  const recentLeads = await db.lead.findMany({
    where: { createdAt: { gte: since } },
    include: { claims: true },
    orderBy: { createdAt: "desc" },
  });

  const newClaimIds: string[] = [];

  for (const lead of recentLeads) {
    if (!niches.includes(lead.niche.trim().toLowerCase())) continue;
    if (lead.lat == null || lead.lng == null) continue;
    if (lead.claims.length >= MAX_CONTRACTORS_PER_LEAD) continue;
    if (lead.claims.some((c) => c.contractorId === contractor.id)) continue;

    const distance = milesBetween({ lat: lead.lat, lng: lead.lng }, { lat: contractor.lat, lng: contractor.lng });
    if (distance > contractor.radiusMiles) continue;

    const claim = await db.claim.create({ data: { leadId: lead.id, contractorId: contractor.id } });
    newClaimIds.push(claim.id);
  }

  return newClaimIds;
}
