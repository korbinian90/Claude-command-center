import { NextResponse } from "next/server";
import { createGoal, listGoals } from "../../../server/fs-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const goals = await listGoals();
  return NextResponse.json({ goals });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { title?: string; objective?: string }
    | null;
  if (!body || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  const goal = await createGoal(body.title.trim(), (body.objective ?? "").trim());
  return NextResponse.json({ goal }, { status: 201 });
}
