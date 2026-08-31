import { NextRequest, NextResponse } from "next/server";
import { runDiscoveryForTerritory } from "@/lib/discovery";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await runDiscoveryForTerritory(params.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
