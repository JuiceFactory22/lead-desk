import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unlockFreeLead } from "@/lib/outreach";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export async function POST(req: NextRequest) {
  const event = await req.json();

  if (event.messageType !== "SMS" || event.direction !== "inbound") {
    return NextResponse.json({ ok: true, skipped: "not an inbound SMS" });
  }

  const body: string = (event.body || "").trim().toLowerCase();
  const looksLikeYes = body === "yes" || body === "y" || body.startsWith("yes");
  if (!looksLikeYes) {
    return NextResponse.json({ ok: true, skipped: "not a yes" });
  }

  const fromPhone = normalizePhone(event.from || "");
  if (!fromPhone) {
    return NextResponse.json({ ok: true, skipped: "no from number" });
  }

  const contractors = await db.contractor.findMany();
  const contractor = contractors.find((c) => normalizePhone(c.phone) === fromPhone);
  if (!contractor) {
    return NextResponse.json({ ok: true, skipped: "no matching contractor" });
  }

  const pendingClaim = await db.claim.findFirst({
    where: { contractorId: contractor.id, status: "sent" },
    orderBy: { sentAt: "asc" },
  });
  if (!pendingClaim) {
    return NextResponse.json({ ok: true, skipped: "no pending claim for this contractor" });
  }

  await unlockFreeLead(pendingClaim.id);
  return NextResponse.json({ ok: true, unlocked: pendingClaim.id });
}
