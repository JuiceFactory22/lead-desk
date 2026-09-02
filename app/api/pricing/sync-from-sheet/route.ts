import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchPricingFromSheet } from "@/lib/sheetPricing";

export async function POST() {
  try {
    const rows = await fetchPricingFromSheet();
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const existing = await db.pricingRule.findFirst({
        where: { niche: row.niche, jobType: row.jobType, zips: null },
      });
      if (existing) {
        await db.pricingRule.update({ where: { id: existing.id }, data: { priceCents: row.priceCents } });
        updated++;
      } else {
        await db.pricingRule.create({
          data: { niche: row.niche, jobType: row.jobType, zips: null, priceCents: row.priceCents },
        });
        created++;
      }
    }

    return NextResponse.json({ ok: true, created, updated, total: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
