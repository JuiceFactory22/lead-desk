import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { triggerClaimOutreach } from "@/lib/outreach";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const claim = await db.claim.findUnique({ where: { id: params.id } });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const updated = await triggerClaimOutreach(params.id);
    return NextResponse.json({
      free: (updated as any).isFree ?? false,
      checkoutUrl: (updated as any).squarePaymentLinkUrl ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process claim";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
