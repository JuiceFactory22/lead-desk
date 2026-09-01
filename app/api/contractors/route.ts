import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { geocodeZip } from "@/lib/geocode";

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

  return NextResponse.json(contractor);
}
