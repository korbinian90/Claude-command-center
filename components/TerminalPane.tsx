"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useAppStore } from "../lib/store";

const TerminalTab = dynamic(() => import("./TerminalTab"), { ssr: false });

export default function TerminalPane() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const activeGoalSlug = useAppStore((s) => s.activeGoalSlug);
  const goals = useAppStore((s) => s.goals);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const removeTab = useAppStore((s) => s.removeTab);
  const addTab = useAppStore((s) => s.addTab);

  const activeGoal = useMemo(
    () => goals.find((g) => g.slug === activeGoalSlug) ?? null,
    [goals, activeGoalSlug],
  );

  const visibleTabs = useMemo(
    () => (activeGoalSlug ? tabs.filter((t) => t.slug === activeGoalSlug) : []),
    [tabs, activeGoalSlug],
  );

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-panel)]">
      <div className="flex h-9 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2">
        {visibleTabs.map((t, i) => {
          const active = t.id === activeTabId;
          const statusDot =
            t.status === "open"
              ? "bg-[var(--color-success)]"
              : t.status === "pending"
                ? "bg-[var(--color-accent)] animate-pulse"
                : t.status === "error"
                  ? "bg-[var(--color-danger)]"
                  : "bg-[var(--color-fg-dim)]";
          return (
            <div
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={[
                "group flex h-7 max-w-[220px] cursor-pointer items-center gap-2 rounded-t px-3 text-[12px] transition-colors",
                active
                  ? "bg-[var(--color-panel)] text-[var(--color-fg)]"
                  : "bg-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-raised)]",
              ].join(" ")}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
              <span className="truncate">
                {t.title}
                {visibleTabs.length > 1 ? ` · ${i + 1}` : ""}
              </span>
              <button
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(t.id);
                }}
                className="rounded px-1 text-[var(--color-fg-dim)] opacity-0 hover:bg-[var(--color-border)] hover:text-[var(--color-fg)] group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          );
        })}
        {activeGoal ? (
          <button
            onClick={() =>
              addTab({
                id: crypto.randomUUID(),
                slug: activeGoal.slug,
                title: activeGoal.title,
                sessionId: null,
                status: "pending",
              })
            }
            title="New tab (⌘T)"
            className="ml-1 rounded px-2 py-0.5 text-[var(--color-fg-dim)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-fg)]"
          >
            +
          </button>
        ) : null}
        <div className="ml-auto pr-2 text-[11px] text-[var(--color-fg-dim)]">
          {activeGoal ? activeGoal.slug : "no goal selected"}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {visibleTabs.length === 0 ? (
          <EmptyTerminalState hasGoal={!!activeGoal} />
        ) : (
          visibleTabs.map((t) => (
            <div
              key={t.id}
              className="absolute inset-0"
              style={{ visibility: t.id === activeTabId ? "visible" : "hidden" }}
            >
              <TerminalTab tabId={t.id} slug={t.slug} active={t.id === activeTabId} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyTerminalState({ hasGoal }: { hasGoal: boolean }) {
  const addTab = useAppStore((s) => s.addTab);
  const activeGoalSlug = useAppStore((s) => s.activeGoalSlug);
  const goals = useAppStore((s) => s.goals);
  const goal = goals.find((g) => g.slug === activeGoalSlug);

  return (
    <div className="flex h-full items-center justify-center text-[var(--color-fg-muted)]">
      <div className="max-w-md text-center">
        {hasGoal && goal ? (
          <>
            <div className="mb-3 text-[13px]">No terminal open for this goal.</div>
            <button
              onClick={() =>
                addTab({
                  id: crypto.randomUUID(),
                  slug: goal.slug,
                  title: goal.title,
                  sessionId: null,
                  status: "pending",
                })
              }
              className="rounded border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-3 py-1.5 text-[12px] text-[var(--color-fg)] hover:bg-[var(--color-bg-raised)]"
            >
              Start claude session
            </button>
          </>
        ) : (
          <div className="text-[12px]">Select a goal from the left pane to begin.</div>
        )}
      </div>
    </div>
  );
}
