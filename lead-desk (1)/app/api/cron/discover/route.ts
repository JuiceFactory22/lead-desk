import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runDiscoveryForTerritory } from "@/lib/discovery";

// Periodic top-up: re-runs the Places search for every active
// territory so newly opened or newly listed contractors get pulled
// into the review queue automatically. Wired to Vercel Cron (see
// vercel.json) but works with any scheduler that can hit a URL with
// this header.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const territories = await db.territory.findMany({ where: { active: true } });
  const results = [];

  for (const territory of territories) {
    try {
      const { added } = await runDiscoveryForTerritory(territory.id);
      results.push({ territory: territory.name, added });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed";
      results.push({ territory: territory.name, error: message });
    }
  }

  return NextResponse.json({ results });
}
