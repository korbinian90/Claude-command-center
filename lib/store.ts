"use client";

import { create } from "zustand";
import type { Lane } from "./lanes";

export interface Goal {
  slug: string;
  title: string;
  lane: Lane;
  createdAt: string;
  updatedAt: string;
}

export interface Tab {
  id: string; // local client id
  slug: string;
  title: string;
  sessionId: string | null; // server-assigned once spawned
  status: "pending" | "open" | "exited" | "error";
}

export interface ReviewItem {
  name: string;
  path: string;
  mtime: string;
  seen: boolean;
}

interface AppState {
  goals: Goal[];
  activeGoalSlug: string | null;
  tabs: Tab[];
  activeTabId: string | null;
  reviewItems: ReviewItem[];
  wsOpen: boolean;
  claudeCliMissing: boolean;

  setGoals(goals: Goal[]): void;
  upsertGoal(goal: Goal): void;
  removeGoal(slug: string): void;
  setActiveGoal(slug: string | null): void;

  addTab(tab: Tab): void;
  updateTab(id: string, patch: Partial<Tab>): void;
  removeTab(id: string): void;
  setActiveTab(id: string | null): void;

  setReviewItems(items: ReviewItem[]): void;
  addReviewItem(item: ReviewItem): void;
  markReviewSeen(name: string): void;
  markAllReviewSeen(): void;

  setWsOpen(open: boolean): void;
  setClaudeCliMissing(v: boolean): void;
}

export const useAppStore = create<AppState>((set) => ({
  goals: [],
  activeGoalSlug: null,
  tabs: [],
  activeTabId: null,
  reviewItems: [],
  wsOpen: false,
  claudeCliMissing: false,

  setGoals: (goals) => set({ goals }),
  upsertGoal: (goal) =>
    set((s) => {
      const idx = s.goals.findIndex((g) => g.slug === goal.slug);
      if (idx === -1) return { goals: [...s.goals, goal] };
      const next = s.goals.slice();
      next[idx] = goal;
      return { goals: next };
    }),
  removeGoal: (slug) =>
    set((s) => ({
      goals: s.goals.filter((g) => g.slug !== slug),
      activeGoalSlug: s.activeGoalSlug === slug ? null : s.activeGoalSlug,
      tabs: s.tabs.filter((t) => t.slug !== slug),
    })),
  setActiveGoal: (slug) => set({ activeGoalSlug: slug }),

  addTab: (tab) => set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id })),
  updateTab: (id, patch) =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  removeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId =
        s.activeTabId === id ? (tabs.length > 0 ? tabs[tabs.length - 1].id : null) : s.activeTabId;
      return { tabs, activeTabId };
    }),
  setActiveTab: (id) => set({ activeTabId: id }),

  setReviewItems: (items) => set({ reviewItems: items }),
  addReviewItem: (item) =>
    set((s) => {
      const without = s.reviewItems.filter((r) => r.name !== item.name);
      return { reviewItems: [item, ...without] };
    }),
  markReviewSeen: (name) =>
    set((s) => ({
      reviewItems: s.reviewItems.map((r) => (r.name === name ? { ...r, seen: true } : r)),
    })),
  markAllReviewSeen: () =>
    set((s) => ({ reviewItems: s.reviewItems.map((r) => ({ ...r, seen: true })) })),

  setWsOpen: (open) => set({ wsOpen: open }),
  setClaudeCliMissing: (v) => set({ claudeCliMissing: v }),
}));
