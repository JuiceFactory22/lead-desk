import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password === process.env.TEAM_PASSWORD) {
    await createSession("admin");
    return NextResponse.json({ ok: true });
  }

  if (password && password === process.env.EMPLOYEE_PASSWORD) {
    await createSession("employee");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
