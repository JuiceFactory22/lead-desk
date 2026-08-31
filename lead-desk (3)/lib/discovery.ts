import { db } from "./db";
import { searchPlaces } from "./googlePlaces";

// Runs one Places search per (niche, zip) pair in the territory,
// skips anything already a real Contractor or already sitting in the
// review queue for this territory, and files new candidates as
// "pending" for the team to approve. Safe to run repeatedly --
// re-running just tops up with anything genuinely new.
export async function runDiscoveryForTerritory(territoryId: string) {
  const territory = await db.territory.findUnique({ where: { id: territoryId } });
  if (!territory) throw new Error("Territory not found");

  const niches = territory.niches.split(",").map((n) => n.trim()).filter(Boolean);
  const zips = territory.zips.split(",").map((z) => z.trim()).filter(Boolean);

  const existingContractors = await db.contractor.findMany({ select: { phone: true } });
  const existingPhones = new Set(existingContractors.map((c) => c.phone.replace(/\D/g, "")));

  const existingDiscovered = await db.discoveredContractor.findMany({
    where: { territoryId },
    select: { placeId: true },
  });
  const seenPlaceIds = new Set(existingDiscovered.map((d) => d.placeId));

  let added = 0;

  for (const niche of niches) {
    for (const zip of zips) {
      const results = await searchPlaces(`${niche} contractors in ${zip}`);

      for (const result of results) {
        if (seenPlaceIds.has(result.id)) continue;
        seenPlaceIds.add(result.id); // avoid duplicate work within this same run

        // Already a working contractor under this number -- don't
        // re-surface them as a new candidate.
        if (result.phone && existingPhones.has(result.phone.replace(/\D/g, ""))) continue;

        await db.discoveredContractor.create({
          data: {
            territoryId,
            placeId: result.id,
            name: result.name,
            phone: result.phone,
            address: result.address,
          },
        });
        added++;
      }
    }
  }

  return { added };
}
