import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    claudeCliPath: process.env.CLAUDE_CLI_PATH || null,
    agentRoot: process.env.AGENT_ROOT || null,
  });
}
