"use client";

import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useMemo } from "react";
import { LANES, type Lane } from "../lib/lanes";
import { useAppStore, type Goal } from "../lib/store";
import KanbanCard from "./KanbanCard";

const LANE_HINTS: Record<Lane, string> = {
  Active: "queued",
  Executing: "in progress",
  Review: "awaiting you",
  Done: "shipped",
};

interface Props {
  onNewGoal: () => void;
}

export default function KanbanPane({ onNewGoal }: Props) {
  const goals = useAppStore((s) => s.goals);
  const activeGoalSlug = useAppStore((s) => s.activeGoalSlug);
  const setActiveGoal = useAppStore((s) => s.setActiveGoal);
  const upsertGoal = useAppStore((s) => s.upsertGoal);

  const lanes = useMemo(() => {
    const grouped: Record<Lane, Goal[]> = {
      Active: [],
      Executing: [],
      Review: [],
      Done: [],
    };
    for (const g of goals) grouped[g.lane].push(g);
    return grouped;
  }, [goals]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function onDragEnd(e: DragEndEvent) {
    const slug = e.active.id as string;
    const overId = e.over?.id as string | undefined;
    if (!overId) return;
    const lane = overId as Lane;
    if (!LANES.includes(lane)) return;
    const goal = goals.find((g) => g.slug === slug);
    if (!goal || goal.lane === lane) return;
    // Optimistic
    upsertGoal({ ...goal, lane });
    try {
      const res = await fetch(`/api/goals/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lane }),
      });
      if (!res.ok) throw new Error("patch failed");
      const data = (await res.json()) as { goal: Goal };
      upsertGoal(data.goal);
    } catch {
      // Rollback
      upsertGoal(goal);
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-panel)]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3">
        <div className="text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)]">
          Goals
        </div>
        <button
          onClick={onNewGoal}
          title="New goal (⌘N)"
          className="rounded border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] px-2 py-0.5 text-[11px] text-[var(--color-fg)] hover:border-[var(--color-accent)]"
        >
          + New
        </button>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {LANES.map((lane) => (
            <LaneColumn
              key={lane}
              lane={lane}
              hint={LANE_HINTS[lane]}
              goals={lanes[lane]}
              activeSlug={activeGoalSlug}
              onSelect={setActiveGoal}
            />
          ))}
          {goals.length === 0 ? (
            <div className="rounded border border-dashed border-[var(--color-border-strong)] p-4 text-center text-[11px] text-[var(--color-fg-muted)]">
              No goals yet. Click <span className="text-[var(--color-fg)]">+ New</span> to create
              one.
            </div>
          ) : null}
        </div>
      </DndContext>
    </div>
  );
}

function LaneColumn({
  lane,
  hint,
  goals,
  activeSlug,
  onSelect,
}: {
  lane: Lane;
  hint: string;
  goals: Goal[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: lane });
  return (
    <section
      ref={setNodeRef}
      className={[
        "rounded border bg-[var(--color-bg)]/30 p-2 transition-colors",
        isOver
          ? "border-[var(--color-accent)]/60 bg-[var(--color-bg-raised)]"
          : "border-[var(--color-border)]",
      ].join(" ")}
    >
      <header className="mb-2 flex items-baseline justify-between px-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-fg)]">
          {lane}
        </div>
        <div className="text-[10px] text-[var(--color-fg-dim)]">
          {goals.length} · {hint}
        </div>
      </header>
      <div className="space-y-1.5">
        {goals.map((g) => (
          <KanbanCard
            key={g.slug}
            goal={g}
            active={activeSlug === g.slug}
            onSelect={() => onSelect(g.slug)}
          />
        ))}
        {goals.length === 0 ? (
          <div className="rounded border border-dashed border-[var(--color-border)] p-2 text-center text-[10px] text-[var(--color-fg-dim)]">
            drop here
          </div>
        ) : null}
      </div>
    </section>
  );
}
