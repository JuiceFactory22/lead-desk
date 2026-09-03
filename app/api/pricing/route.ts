import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

export async function GET() {
  const rules = await db.pricingRule.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const role = await getRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can add pricing rules" }, { status: 403 });
  }

  const body = await req.json();
  const { niche, jobType, zips, priceCents } = body;

  if (!niche || !priceCents) {
    return NextResponse.json({ error: "Niche and price are required" }, { status: 400 });
  }

  const rule = await db.pricingRule.create({
    data: {
      niche: niche.toLowerCase(),
      jobType: jobType || null,
      zips: zips || null,
      priceCents: Number(priceCents),
    },
  });

  return NextResponse.json(rule);
}
