import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const contractors = await db.contractor.findMany({
    orderBy: { createdAt: "desc" },
    include: { claims: true },
  });
  return NextResponse.json(contractors);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, company, phone, email, niches, zips, freeLeadsLimit, notes } = body;

  if (!name || !phone || !niches || !zips) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const contractor = await db.contractor.create({
    data: {
      name,
      company: company || null,
      phone,
      email: email || null,
      niches: niches.toLowerCase(),
      zips,
      freeLeadsLimit: freeLeadsLimit ? Number(freeLeadsLimit) : 2,
      notes: notes || null,
    },
  });

  return NextResponse.json(contractor);
}
