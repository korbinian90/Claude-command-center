"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Goal } from "../lib/store";

interface Props {
  goal: Goal;
  active: boolean;
  onSelect: () => void;
}

export default function KanbanCard({ goal, active, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: goal.slug,
    data: { slug: goal.slug },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`Goal ${goal.title}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={[
        "group cursor-grab touch-none select-none rounded border bg-[var(--color-bg-elev)] p-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] active:cursor-grabbing",
        active
          ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/40"
          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
      ].join(" ")}
    >
      <div className="truncate text-[12px] font-medium text-[var(--color-fg)]">{goal.title}</div>
      <div className="mt-1 font-mono text-[10px] text-[var(--color-fg-dim)]">{goal.slug}</div>
    </div>
  );
}
