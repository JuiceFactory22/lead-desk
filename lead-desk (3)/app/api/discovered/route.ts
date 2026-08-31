import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const discovered = await db.discoveredContractor.findMany({
    where: { status: "pending" },
    include: { territory: true },
    orderBy: { foundAt: "desc" },
  });
  return NextResponse.json(discovered);
}
