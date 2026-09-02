import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const territories = await db.territory.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(territories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, niches, zips } = body;

  if (!name || !niches || !zips) {
    return NextResponse.json({ error: "Name, niches, and zips are required" }, { status: 400 });
  }

  const territory = await db.territory.create({
    data: { name, niches: niches.toLowerCase(), zips },
  });

  return NextResponse.json(territory);
}
