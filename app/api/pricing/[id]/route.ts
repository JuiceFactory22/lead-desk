import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRole } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const role = await getRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can edit pricing rules" }, { status: 403 });
  }
  const body = await req.json();
  const rule = await db.pricingRule.update({ where: { id: params.id }, data: body });
  return NextResponse.json(rule);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const role = await getRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can delete pricing rules" }, { status: 403 });
  }
  await db.pricingRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
