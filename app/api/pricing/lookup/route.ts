import { NextRequest, NextResponse } from "next/server";
import { getPriceForLead } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const niche = searchParams.get("niche") || "";
  const jobType = searchParams.get("jobType");
  const zip = searchParams.get("zip") || "";

  if (!niche || !zip) {
    return NextResponse.json({ priceCents: null });
  }

  const priceCents = await getPriceForLead(niche, jobType, zip);
  return NextResponse.json({ priceCents });
}
