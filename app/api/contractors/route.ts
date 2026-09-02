import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { geocodeZip } from "@/lib/geocode";
import { backfillContractorIntoRecentLeads } from "@/lib/matching";
import { triggerClaimOutreach } from "@/lib/outreach";

export async function GET() {
  const contractors = await db.contractor.findMany({
    orderBy: { createdAt: "desc" },
    include: { claims: true },
  });
  return NextResponse.json(contractors);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, company, phone, email, niches, baseZip, radiusMiles, freeLeadsLimit, notes } = body;

  if (!name || !phone || !niches || !baseZip) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const coords = await geocodeZip(baseZip);
  if (!coords) {
    return NextResponse.json({ error: `Couldn't find that zip code (${baseZip}) -- double check it's a valid US zip` }, { status: 400 });
  }

  const contractor = await db.contractor.create({
    data: {
      name,
      company: company || null,
      phone,
      email: email || null,
      niches: niches.toLowerCase(),
      baseZip,
      radiusMiles: radiusMiles ? Number(radiusMiles) : 25,
      lat: coords.lat,
      lng: coords.lng,
      freeLeadsLimit: freeLeadsLimit ? Number(freeLeadsLimit) : 2,
      notes: notes || null,
    },
  });

    const backfilledClaimIds = await backfillContractorIntoRecentLeads(contractor);
  // Only text about the single most recent match (the list is
  // newest-first) -- the rest still show up on their lead pages for
  // the team to notice, just without a separate text for each.
  if (backfilledClaimIds.length > 0) {
    await triggerClaimOutreach(backfilledClaimIds[0]);
  }

  return NextResponse.json({ ...contractor, backfilledLeadCount: backfilledClaimIds.length });
}
