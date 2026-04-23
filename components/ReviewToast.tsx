"use client";

import { useEffect } from "react";
import { useAppStore } from "../lib/store";

export default function ReviewToast() {
  const items = useAppStore((s) => s.reviewItems);
  const markReviewSeen = useAppStore((s) => s.markReviewSeen);
  const unseen = items.filter((i) => !i.seen);

  useEffect(() => {
    if (unseen.length === 0) return;
    const t = setTimeout(() => {
      // Auto-dismiss the oldest unseen toast after 8s; badge remains in TopBar.
      markReviewSeen(unseen[unseen.length - 1].name);
    }, 8000);
    return () => clearTimeout(t);
  }, [unseen, markReviewSeen]);

  if (unseen.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {unseen.slice(0, 3).map((it) => (
        <div
          key={it.name}
          className="pointer-events-auto flex w-80 items-start gap-2 rounded border border-[var(--color-accent)]/50 bg-[var(--color-bg-elev)] p-3 shadow-lg"
        >
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-accent)]">
              Review requested
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-[var(--color-fg)]">
              {it.name}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-[var(--color-fg-dim)]">{it.path}</div>
          </div>
          <button
            onClick={() => markReviewSeen(it.name)}
            className="rounded px-1 text-[var(--color-fg-dim)] hover:bg-[var(--color-border)] hover:text-[var(--color-fg)]"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
