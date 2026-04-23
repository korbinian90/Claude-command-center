import { NextResponse } from "next/server";
import { LANES, type Lane } from "../../../../lib/paths";
import { deleteGoal, readGoal, updateGoalLane } from "../../../../server/fs-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const goal = await readGoal(slug);
  if (!goal) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ goal });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { lane?: string } | null;
  if (!body || !body.lane || !LANES.includes(body.lane as Lane)) {
    return NextResponse.json({ error: "invalid lane" }, { status: 400 });
  }
  const goal = await updateGoalLane(slug, body.lane as Lane);
  if (!goal) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ goal });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const ok = await deleteGoal(slug);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
