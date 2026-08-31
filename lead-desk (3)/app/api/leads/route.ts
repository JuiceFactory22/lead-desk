import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchContractors } from "@/lib/matching";

export async function GET() {
  const leads = await db.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { claims: true },
  });
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, email, address, zip, niche, jobDetails, source, priceCents } = body;

  if (!name || !phone || !address || !zip || !niche || !jobDetails) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const lead = await db.lead.create({
    data: {
      name,
      phone,
      email: email || null,
      address,
      zip,
      niche,
      jobDetails,
      source: source || null,
      priceCents: priceCents ? Number(priceCents) : 3500,
    },
  });

  // Auto-match up to 5 contractors in this niche + zip and create a
  // "sent" claim for each -- this is the list your team works from
  // when they send the CallRail text blast.
  const matches = await matchContractors(niche, zip, 5);
  if (matches.length) {
    await db.claim.createMany({
      data: matches.map((c) => ({ leadId: lead.id, contractorId: c.id })),
    });
  }

  return NextResponse.json({ id: lead.id, matchedCount: matches.length });
}
