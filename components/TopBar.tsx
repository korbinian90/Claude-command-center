"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "../lib/store";
import { wsClient, type WsStatus } from "../lib/ws-client";

interface Props {
  onNewGoal: () => void;
}

export default function TopBar({ onNewGoal }: Props) {
  const activeGoalSlug = useAppStore((s) => s.activeGoalSlug);
  const goals = useAppStore((s) => s.goals);
  const claudeCliMissing = useAppStore((s) => s.claudeCliMissing);
  const reviewItems = useAppStore((s) => s.reviewItems);
  const markAllReviewSeen = useAppStore((s) => s.markAllReviewSeen);
  const [wsStatus, setWsStatus] = useState<WsStatus>("idle");

  useEffect(() => {
    const client = wsClient();
    client.ensureConnected();
    return client.onStatus(setWsStatus);
  }, []);

  const activeGoal = goals.find((g) => g.slug === activeGoalSlug) ?? null;
  const unseenReview = reviewItems.filter((i) => !i.seen).length;

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
          <span className="text-[12px] font-semibold tracking-tight text-[var(--color-fg)]">
            Command Center
          </span>
        </div>
        <span className="text-[var(--color-fg-dim)]">·</span>
        <span className="font-mono text-[11px] text-[var(--color-fg-muted)]">
          {activeGoal ? activeGoal.title : "no active goal"}
          {activeGoal ? (
            <span className="ml-2 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-fg)]">
              {activeGoal.lane}
            </span>
          ) : null}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {claudeCliMissing ? (
          <span className="rounded border border-[var(--color-danger)]/60 bg-[var(--color-danger)]/10 px-2 py-0.5 text-[10px] text-[var(--color-danger)]">
            claude CLI not on PATH
          </span>
        ) : null}
        <button
          onClick={() => markAllReviewSeen()}
          title="Pending reviews"
          className="relative rounded px-2 py-0.5 text-[11px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-fg)]"
        >
          Review
          {unseenReview > 0 ? (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-semibold text-[var(--color-bg)]">
              {unseenReview}
            </span>
          ) : null}
        </button>
        <button
          onClick={onNewGoal}
          className="rounded border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] px-2 py-0.5 text-[11px] text-[var(--color-fg)] hover:border-[var(--color-accent)]"
        >
          New goal
        </button>
        <WsIndicator status={wsStatus} />
      </div>
    </div>
  );
}

function WsIndicator({ status }: { status: WsStatus }) {
  const color =
    status === "open"
      ? "bg-[var(--color-success)]"
      : status === "connecting"
        ? "bg-[var(--color-accent)] animate-pulse"
        : status === "error" || status === "closed"
          ? "bg-[var(--color-danger)]"
          : "bg-[var(--color-fg-dim)]";
  const label =
    status === "open"
      ? "online"
      : status === "connecting"
        ? "connecting"
        : status === "error"
          ? "error"
          : status === "closed"
            ? "offline"
            : "idle";
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-fg-dim)]">
      <div className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span className="font-mono">{label}</span>
    </div>
  );
}
