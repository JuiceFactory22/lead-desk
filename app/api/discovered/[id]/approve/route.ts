import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Turns a discovered candidate into a real Contractor, inheriting the
// niches + zips from the territory it was found in, then marks the
// candidate approved so it drops out of the review queue.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const candidate = await db.discoveredContractor.findUnique({
    where: { id: params.id },
    include: { territory: true },
  });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!candidate.phone) {
    return NextResponse.json({ error: "No phone number on file for this listing" }, { status: 400 });
  }

  const contractor = await db.contractor.create({
    data: {
      name: candidate.name,
      phone: candidate.phone,
      niches: candidate.territory.niches,
      zips: candidate.territory.zips,
      notes: `Discovered via Places search for ${candidate.territory.name}${candidate.address ? ` — ${candidate.address}` : ""}`,
    },
  });

  await db.discoveredContractor.update({ where: { id: params.id }, data: { status: "approved" } });

  return NextResponse.json(contractor);
}
