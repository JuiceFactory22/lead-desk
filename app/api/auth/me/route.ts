import { NextResponse } from "next/server";
import { getRole } from "@/lib/auth";

export async function GET() {
  const role = await getRole();
  return NextResponse.json({ role });
}
