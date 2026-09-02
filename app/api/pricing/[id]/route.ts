import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const rule = await db.pricingRule.update({ where: { id: params.id }, data: body });
  return NextResponse.json(rule);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.pricingRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
