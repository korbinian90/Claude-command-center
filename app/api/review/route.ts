import { NextResponse } from "next/server";
import { listReviewItems } from "../../../server/fs-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listReviewItems();
  return NextResponse.json({ items });
}
