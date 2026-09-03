import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { geocodeZip } from "@/lib/geocode";

type ImportRow = { name: string; phone: string };

// Bulk-adds existing contractors from one market/niche at a time --
// matches how the research sheet is organized (one tab per
// niche+city). Geocodes the city once for the whole batch rather
// than per row, and deliberately triggers no automatic outreach --
// these are already-known contractors, not someone reacting to a
// fresh lead.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { niche, city, radiusMiles, freeLeadsLimit, rows } = body as {
    niche: string;
    city: string;
    radiusMiles?: number;
    freeLeadsLimit?: number;
    rows: ImportRow[];
  };

  if (!niche || !city || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Niche, city, and at least one contractor row are required" }, { status: 400 });
  }

  const coords = await geocodeZip(city);
  if (!coords) {
    return NextResponse.json({ error: `Couldn't find that location (${city}) -- try a more specific city, state` }, { status: 400 });
  }

  const existing = await db.contractor.findMany({ select: { phone: true } });
  const existingPhones = new Set(existing.map((c) => c.phone.replace(/\D/g, "")));

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.name || !row.phone) {
      errors.push(`Missing name or phone: ${JSON.stringify(row)}`);
      continue;
    }
    const normalizedPhone = row.phone.replace(/\D/g, "");
    if (existingPhones.has(normalizedPhone)) {
      skipped++;
      continue;
    }
    try {
      await db.contractor.create({
        data: {
          name: row.name,
          phone: row.phone,
          niches: niche.toLowerCase(),
          baseZip: city,
          radiusMiles: radiusMiles || 40,
          lat: coords.lat,
          lng: coords.lng,
          freeLeadsLimit: freeLeadsLimit ?? 3,
        },
      });
      existingPhones.add(normalizedPhone);
      created++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${row.name}: ${message}`);
    }
  }

  return NextResponse.json({ created, skipped, errors });
}
