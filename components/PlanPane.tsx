"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { useAppStore } from "../lib/store";
import { wsClient } from "../lib/ws-client";
import type { ServerMessage } from "../lib/ws-types";

export default function PlanPane() {
  const activeGoalSlug = useAppStore((s) => s.activeGoalSlug);
  const [content, setContent] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const debounceRef = useRef<number | null>(null);

  const fetchPlan = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`/api/plan/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        setContent(null);
        return;
      }
      const data = (await res.json()) as { slug: string; content: string };
      setContent(data.content);
      setNotFound(false);
      setLastUpdated(Date.now());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!activeGoalSlug) {
      setContent(null);
      setNotFound(false);
      return;
    }
    fetchPlan(activeGoalSlug);
  }, [activeGoalSlug, fetchPlan]);

  useEffect(() => {
    if (!activeGoalSlug) return;
    const client = wsClient();
    client.ensureConnected();
    const unsubscribe = client.on((msg: ServerMessage) => {
      if (msg.type === "plan:updated" && msg.slug === activeGoalSlug) {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => fetchPlan(activeGoalSlug), 120);
      }
    });
    return () => {
      unsubscribe();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [activeGoalSlug, fetchPlan]);

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-panel)]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3">
        <div className="text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)]">
          Living plan
        </div>
        <div className="font-mono text-[10px] text-[var(--color-fg-dim)]">
          {activeGoalSlug ? `${activeGoalSlug}/plan.md` : "—"}
          {lastUpdated ? ` · ${timeAgo(lastUpdated)}` : ""}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!activeGoalSlug ? (
          <EmptyState message="Select a goal to view its living plan." />
        ) : notFound ? (
          <EmptyState message="No plan.md found for this goal yet." />
        ) : content === null ? (
          <EmptyState message="Loading…" />
        ) : (
          <article className="md-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {content}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-[12px] text-[var(--color-fg-muted)]">
      {message}
    </div>
  );
}

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}
