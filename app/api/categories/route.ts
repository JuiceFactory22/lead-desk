import { NextResponse } from "next/server";
import { getCategoriesFromPricing } from "@/lib/categories";
import { NICHES, JOB_TYPES } from "@/lib/niches";

// Always run fresh -- otherwise Next.js can cache this route's
// response from build time, meaning newly synced categories (like
// Drywall or Metal Buildings) wouldn't show up until the next deploy.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { niches, jobTypesByNiche } = await getCategoriesFromPricing();
    if (niches.length === 0) {
      return NextResponse.json({ niches: NICHES, jobTypesByNiche: JOB_TYPES });
    }
    return NextResponse.json({ niches, jobTypesByNiche });
  } catch {
    return NextResponse.json({ niches: NICHES, jobTypesByNiche: JOB_TYPES });
  }
}
