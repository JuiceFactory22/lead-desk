import { db } from "./db";
import { searchPlaces, getPlaceDetails } from "./googlePlaces";

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
        if (seenPlaceIds.has(result.place_id)) continue;
        seenPlaceIds.add(result.place_id); // avoid duplicate work within this same run

        const details = await getPlaceDetails(result.place_id);
        const phone = details?.formatted_phone_number || null;

        // Already a working contractor under this number -- don't
        // re-surface them as a new candidate.
        if (phone && existingPhones.has(phone.replace(/\D/g, ""))) continue;

        await db.discoveredContractor.create({
          data: {
            territoryId,
            placeId: result.place_id,
            name: details?.name || result.name,
            phone,
            address: details?.formatted_address || result.formatted_address || null,
          },
        });
        added++;
      }
    }
  }

  return { added };
}
