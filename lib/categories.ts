import { db } from "./db";

export async function getCategoriesFromPricing(): Promise<{
  niches: string[];
  jobTypesByNiche: Record<string, string[]>;
}> {
  const rules = await db.pricingRule.findMany({
    where: { active: true },
    select: { niche: true, jobType: true },
  });

  const nicheSet = new Set<string>();
  const jobTypeSets: Record<string, Set<string>> = {};

  for (const r of rules) {
    nicheSet.add(r.niche);
    if (r.jobType) {
      if (!jobTypeSets[r.niche]) jobTypeSets[r.niche] = new Set();
      jobTypeSets[r.niche].add(r.jobType);
    }
  }

  const niches = Array.from(nicheSet).sort();
  const jobTypesByNiche: Record<string, string[]> = {};
  for (const n of niches) {
    jobTypesByNiche[n] = jobTypeSets[n] ? Array.from(jobTypeSets[n]).sort() : [];
  }

  return { niches, jobTypesByNiche };
}
