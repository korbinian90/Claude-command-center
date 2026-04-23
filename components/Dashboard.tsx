"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppStore, type Goal, type ReviewItem } from "../lib/store";
import { wsClient } from "../lib/ws-client";
import type { ServerMessage } from "../lib/ws-types";
import KanbanPane from "./KanbanPane";
import NewGoalDialog from "./NewGoalDialog";
import PlanPane from "./PlanPane";
import ReviewToast from "./ReviewToast";
import TerminalPane from "./TerminalPane";
import TopBar from "./TopBar";

export default function Dashboard() {
  const setGoals = useAppStore((s) => s.setGoals);
  const setActiveGoal = useAppStore((s) => s.setActiveGoal);
  const setReviewItems = useAppStore((s) => s.setReviewItems);
  const addReviewItem = useAppStore((s) => s.addReviewItem);
  const setWsOpen = useAppStore((s) => s.setWsOpen);
  const setClaudeCliMissing = useAppStore((s) => s.setClaudeCliMissing);
  const addTab = useAppStore((s) => s.addTab);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const removeTab = useAppStore((s) => s.removeTab);
  const goals = useAppStore((s) => s.goals);
  const activeGoalSlug = useAppStore((s) => s.activeGoalSlug);

  const [newGoalOpen, setNewGoalOpen] = useState(false);

  const refreshGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals", { cache: "no-store" });
      const data = (await res.json()) as { goals: Goal[] };
      setGoals(data.goals);
    } catch {
      /* ignore */
    }
  }, [setGoals]);

  // Initial load
  useEffect(() => {
    refreshGoals();
    fetch("/api/review", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { items: Array<Omit<ReviewItem, "seen">> }) => {
        setReviewItems(data.items.map((i) => ({ ...i, seen: true })));
      })
      .catch(() => {});
    fetch("/api/preflight", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { claudeCliPath: string | null }) => {
        setClaudeCliMissing(!data.claudeCliPath);
      })
      .catch(() => {});
  }, [refreshGoals, setReviewItems, setClaudeCliMissing]);

  // WS side-effects
  useEffect(() => {
    const client = wsClient();
    client.ensureConnected();
    const offStatus = client.onStatus((s) => setWsOpen(s === "open"));
    const off = client.on((msg: ServerMessage) => {
      if (msg.type === "goal:updated") {
        refreshGoals();
      } else if (msg.type === "review:new") {
        addReviewItem({
          name: msg.name,
          path: msg.path,
          mtime: new Date().toISOString(),
          seen: false,
        });
      }
    });
    return () => {
      offStatus();
      off();
    };
  }, [refreshGoals, addReviewItem, setWsOpen]);

  // Remove goals that no longer exist after a goal:updated broadcast.
  useEffect(() => {
    const slugs = new Set(goals.map((g) => g.slug));
    if (activeGoalSlug && !slugs.has(activeGoalSlug)) setActiveGoal(null);
  }, [goals, activeGoalSlug, setActiveGoal]);

  // When a goal becomes active and no tab is open for it, spawn one automatically.
  useEffect(() => {
    if (!activeGoalSlug) return;
    const existing = tabs.find((t) => t.slug === activeGoalSlug);
    if (existing) {
      if (activeTabId !== existing.id) useAppStore.getState().setActiveTab(existing.id);
      return;
    }
    const goal = goals.find((g) => g.slug === activeGoalSlug);
    if (!goal) return;
    addTab({
      id: crypto.randomUUID(),
      slug: goal.slug,
      title: goal.title,
      sessionId: null,
      status: "pending",
    });
  }, [activeGoalSlug, tabs, activeTabId, goals, addTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setNewGoalOpen(true);
      } else if (e.key.toLowerCase() === "t") {
        const slug = useAppStore.getState().activeGoalSlug;
        if (slug) {
          e.preventDefault();
          const g = useAppStore.getState().goals.find((x) => x.slug === slug);
          if (g)
            addTab({
              id: crypto.randomUUID(),
              slug: g.slug,
              title: g.title,
              sessionId: null,
              status: "pending",
            });
        }
      } else if (e.key.toLowerCase() === "w") {
        const active = useAppStore.getState().activeTabId;
        if (active) {
          e.preventDefault();
          removeTab(active);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addTab, removeTab]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TopBar onNewGoal={() => setNewGoalOpen(true)} />
      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_360px]">
        <div className="min-h-0 border-r border-[var(--color-border)]">
          <KanbanPane onNewGoal={() => setNewGoalOpen(true)} />
        </div>
        <div className="min-h-0">
          <TerminalPane />
        </div>
        <div className="min-h-0 border-l border-[var(--color-border)]">
          <PlanPane />
        </div>
      </div>
      <NewGoalDialog open={newGoalOpen} onClose={() => setNewGoalOpen(false)} />
      <ReviewToast />
    </div>
  );
}
