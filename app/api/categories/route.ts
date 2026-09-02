import { NextResponse } from "next/server";
import { getCategoriesFromPricing } from "@/lib/categories";
import { NICHES, JOB_TYPES } from "@/lib/niches";

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
