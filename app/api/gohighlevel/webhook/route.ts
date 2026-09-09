import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unlockFreeLead } from "@/lib/outreach";
import { sendReplyReceivedEmail } from "@/lib/gohighlevel";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

const REDEEM_EXACT = ["yes", "y", "sure", "ok", "okay", "yeah", "yep", "redeem"];
const REDEEM_PHRASES = ["send it", "i want it", "want it", "sounds good", "i'll take it", "ill take it"];
const DECLINE_EXACT = ["no", "pass", "skip", "nah"];
const DECLINE_PHRASES = ["no thanks", "not for me", "not interested", "i'll pass", "ill pass"];

function detectIntent(body: string): "redeem" | "decline" | null {
  const normalized = body.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (REDEEM_EXACT.includes(normalized) || REDEEM_PHRASES.some((p) => normalized.includes(p))) return "redeem";
  if (DECLINE_EXACT.includes(normalized) || DECLINE_PHRASES.some((p) => normalized.includes(p))) return "decline";
  return null;
}

export async function POST(req: NextRequest) {
  const event = await req.json();

  const rawBody: string = event.message?.body ?? event.customData?.Body ?? event.customData?.body ?? event.body ?? "";
  const rawPhone: string = event.phone ?? event.customData?.Phone ?? event.customData?.phone ?? "";

  const body = String(rawBody).trim();
  const fromPhone = normalizePhone(String(rawPhone));

  if (!fromPhone) {
    return NextResponse.json({ ok: true, skipped: "no phone number" });
  }

  const contractors = await db.contractor.findMany({ orderBy: { createdAt: "desc" } });
  const contractor = contractors.find((c) => normalizePhone(c.phone) === fromPhone) ?? null;

  try {
    await sendReplyReceivedEmail({ fromPhone: rawPhone, body, contractorName: contractor?.name ?? null });
  } catch (err) {
    console.error("Failed to send reply notification email:", err);
  }

  const intent = detectIntent(body);
  if (!intent) {
    return NextResponse.json({ ok: true, skipped: "no clear intent" });
  }

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

  if (intent === "redeem") {
    await unlockFreeLead(pendingClaim.id);
    return NextResponse.json({ ok: true, unlocked: pendingClaim.id });
  }

  await db.claim.update({ where: { id: pendingClaim.id }, data: { status: "declined" } });
  return NextResponse.json({ ok: true, declined: pendingClaim.id });
}
