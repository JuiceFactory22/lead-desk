import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const candidate = await db.discoveredContractor.update({
    where: { id: params.id },
    data: { status: "rejected" },
  });
  return NextResponse.json(candidate);
}
