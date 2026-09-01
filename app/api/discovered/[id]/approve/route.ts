import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { geocodeZip } from "@/lib/geocode";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const candidate = await db.discoveredContractor.findUnique({
    where: { id: params.id },
    include: { territory: true },
  });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!candidate.phone) {
    return NextResponse.json({ error: "No phone number on file for this listing" }, { status: 400 });
  }

  const zipMatch = candidate.address?.match(/\b\d{5}\b/);
  const fallbackZip = territoryFirstZip(candidate.territory.zips);
  const geocodeTarget = candidate.address || zipMatch?.[0] || fallbackZip;
  const coords = geocodeTarget ? await geocodeZip(geocodeTarget) : null;

  const contractor = await db.contractor.create({
    data: {
      name: candidate.name,
      phone: candidate.phone,
      niches: candidate.territory.niches,
      baseZip: zipMatch?.[0] || fallbackZip,
      radiusMiles: 25,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      notes: `Discovered via Places search for ${candidate.territory.name}${candidate.address ? ` — ${candidate.address}` : ""}`,
    },
  });

  await db.discoveredContractor.update({ where: { id: params.id }, data: { status: "approved" } });

  return NextResponse.json(contractor);
}

function territoryFirstZip(zips: string): string {
  return zips.split(",")[0]?.trim() || "";
}
