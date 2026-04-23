import { NextResponse } from "next/server";
import { readPlan } from "../../../../server/fs-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const content = await readPlan(slug);
  if (content === null) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ slug, content });
}
