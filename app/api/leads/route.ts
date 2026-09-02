import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchContractors } from "@/lib/matching";
import { geocodeZip } from "@/lib/geocode";
import { triggerClaimOutreach } from "@/lib/outreach";
import { getPriceForLead } from "@/lib/pricing";

export async function GET() {
  const leads = await db.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { claims: true },
  });
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, email, address, zip, niche, jobType, jobDetails, source, priceCents } = body;

  if (!name || !phone || !address || !zip || !niche || !jobDetails) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const coords = await geocodeZip(zip);

  let finalPriceCents = priceCents ? Number(priceCents) : null;
  if (!finalPriceCents) {
    finalPriceCents = await getPriceForLead(niche, jobType || null, zip);
  }
  if (!finalPriceCents) finalPriceCents = 3500;

  const lead = await db.lead.create({
    data: {
      name,
      phone,
      email: email || null,
      address,
      zip,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      niche,
      jobType: jobType || null,
      jobDetails,
      source: source || null,
      priceCents: finalPriceCents,
    },
  });

  const matches = coords ? await matchContractors(niche, coords.lat, coords.lng, 5) : [];
  let claimIds: string[] = [];
  if (matches.length) {
    const created = await Promise.all(
      matches.map((c) => db.claim.create({ data: { leadId: lead.id, contractorId: c.id } }))
    );
    claimIds = created.map((c) => c.id);
  }

  for (const claimId of claimIds) {
    await triggerClaimOutreach(claimId);
  }

  return NextResponse.json({ id: lead.id, matchedCount: matches.length, geocoded: !!coords, priceCents: finalPriceCents });
}
