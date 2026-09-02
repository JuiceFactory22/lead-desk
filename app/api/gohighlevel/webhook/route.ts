import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unlockFreeLead } from "@/lib/outreach";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export async function POST(req: NextRequest) {
  const event = await req.json();
  console.log("GHL_WEBHOOK_DEBUG", JSON.stringify(event));

  const rawBody: string = event.body ?? event.customData?.body ?? event.message ?? "";
  const rawPhone: string = event.phone ?? event.customData?.phone ?? "";

  const body = String(rawBody).trim().toLowerCase();
  const looksLikeYes = body === "yes" || body === "y" || body.startsWith("yes");
  if (!looksLikeYes) {
    return NextResponse.json({ ok: true, skipped: "not a yes", received: { rawBody, rawPhone } });
  }

  const fromPhone = normalizePhone(String(rawPhone));
  if (!fromPhone) {
    return NextResponse.json({ ok: true, skipped: "no phone number" });
  }

  const contractors = await db.contractor.findMany({ orderBy: { createdAt: "desc" } });
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
