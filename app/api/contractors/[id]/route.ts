import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const contractor = await db.contractor.findUnique({
    where: { id: params.id },
    include: { claims: { include: { lead: true }, orderBy: { sentAt: "desc" } } },
  });
  if (!contractor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contractor);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const contractor = await db.contractor.update({ where: { id: params.id }, data: body });
  return NextResponse.json(contractor);
}
