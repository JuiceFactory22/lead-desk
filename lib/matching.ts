import { db } from "./db";

// Finds active contractors whose niches + zips overlap the lead,
// most-relevant first, capped to `limit` (default 5 per your rule
// of sending each lead to 3-5 contractors).
export async function matchContractors(niche: string, zip: string, limit = 5) {
  const all = await db.contractor.findMany({ where: { active: true } });
  const nicheKey = niche.trim().toLowerCase();
  const zipKey = zip.trim();

  const matches = all.filter((c) => {
    const niches = c.niches.split(",").map((n) => n.trim().toLowerCase());
    const zips = c.zips.split(",").map((z) => z.trim());
    return niches.includes(nicheKey) && zips.includes(zipKey);
  });

  return matches.slice(0, limit);
}
