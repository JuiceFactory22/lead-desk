import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const territories = await db.territory.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(territories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, niches, zips, phoneNumber, isDefault } = body;

  if (!name || !niches || !zips || !phoneNumber) {
    return NextResponse.json({ error: "Name, niches, zips, and phone number are required" }, { status: 400 });
  }

  if (isDefault) {
    await db.territory.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const territory = await db.territory.create({
    data: {
      name,
      niches: niches.toLowerCase(),
      zips,
      phoneNumber,
      isDefault: !!isDefault,
    },
  });

  return NextResponse.json(territory);
}
