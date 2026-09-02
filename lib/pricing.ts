import { db } from "./db";

export async function getPriceForLead(niche: string, jobType: string | null, zip: string): Promise<number | null> {
  const nicheKey = niche.trim().toLowerCase();
  const zipKey = zip.trim();
  const jobTypeKey = jobType?.trim().toLowerCase() || null;

  const rules = await db.pricingRule.findMany({
    where: { active: true, niche: nicheKey },
  });

  function zipsMatch(rule: { zips: string | null }): boolean {
    if (!rule.zips) return false;
    return rule.zips.split(",").map((z) => z.trim()).includes(zipKey);
  }
  function jobTypeMatches(rule: { jobType: string | null }): boolean {
    return !!rule.jobType && !!jobTypeKey && rule.jobType.trim().toLowerCase() === jobTypeKey;
  }

  const areaAndJobType = rules.find((r) => zipsMatch(r) && jobTypeMatches(r));
  if (areaAndJobType) return areaAndJobType.priceCents;

  const jobTypeDefault = rules.find((r) => !r.zips && jobTypeMatches(r));
  if (jobTypeDefault) return jobTypeDefault.priceCents;

  const areaDefault = rules.find((r) => zipsMatch(r) && !r.jobType);
  if (areaDefault) return areaDefault.priceCents;

  const nicheDefault = rules.find((r) => !r.zips && !r.jobType);
  if (nicheDefault) return nicheDefault.priceCents;

  return null;
}
