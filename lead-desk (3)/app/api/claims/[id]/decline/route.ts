import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const claim = await db.claim.update({
    where: { id: params.id },
    data: { status: "declined" },
  });
  return NextResponse.json(claim);
}
