import { db } from "./db";

export async function getPriceForLead(niche: string, jobType: string | null, zip: string): Promise<number | null> {
  const nicheKey = niche.trim().toLowerCase();
  const zipKey = zip.trim();

  const rules = await db.pricingRule.findMany({ where: { active: true } });

  const matching = rules.filter((r) => {
    if (r.niche.trim().toLowerCase() !== nicheKey) return false;
    const zips = r.zips.split(",").map((z) => z.trim());
    return zips.includes(zipKey);
  });

  const specific = matching.find(
    (r) => r.jobType && jobType && r.jobType.trim().toLowerCase() === jobType.trim().toLowerCase()
  );
  if (specific) return specific.priceCents;

  const general = matching.find((r) => !r.jobType);
  if (general) return general.priceCents;

  return null;
}
