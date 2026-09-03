import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { geocodeZip } from "@/lib/geocode";

type ImportRow = { name: string; phone: string; city: string };

// Bulk-adds existing contractors across as many different cities as
// you paste in one go -- each row carries its own city, geocoded
// once per distinct city (not once per contractor) to keep this
// fast for a large mixed list. Deliberately triggers no automatic
// outreach -- these are already-known contractors, not someone
// reacting to a fresh lead.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { niche, radiusMiles, freeLeadsLimit, rows } = body as {
    niche: string;
    radiusMiles?: number;
    freeLeadsLimit?: number;
    rows: ImportRow[];
  };

  if (!niche || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Niche and at least one contractor row are required" }, { status: 400 });
  }

  const existing = await db.contractor.findMany({ select: { phone: true } });
  const existingPhones = new Set(existing.map((c) => c.phone.replace(/\D/g, "")));

  const cityCoords = new Map<string, { lat: number; lng: number } | null>();

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.name || !row.phone || !row.city) {
      errors.push(`Missing fields: ${JSON.stringify(row)}`);
      continue;
    }
    const normalizedPhone = row.phone.replace(/\D/g, "");
    if (existingPhones.has(normalizedPhone)) {
      skipped++;
      continue;
    }

    const cityKey = row.city.trim().toLowerCase();
    if (!cityCoords.has(cityKey)) {
      cityCoords.set(cityKey, await geocodeZip(row.city));
    }
    const coords = cityCoords.get(cityKey);
    if (!coords) {
      errors.push(`Couldn't find location "${row.city}" for ${row.name}`);
      continue;
    }

    try {
      await db.contractor.create({
        data: {
          name: row.name,
          phone: row.phone,
          niches: niche.toLowerCase(),
          baseZip: row.city,
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
