import { NextRequest, NextResponse } from "next/server";
import { deliverClaim } from "@/lib/deliver";

// Manual fallback for the rare case the automatic text failed (bad
// number, Twilio outage, etc). Shown in the UI only when
// claim.deliveryError is set.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const claim = await deliverClaim(params.id);
  return NextResponse.json(claim);
}
