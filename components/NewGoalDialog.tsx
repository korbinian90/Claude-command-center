"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore, type Goal } from "../lib/store";

interface Props {
  open: boolean;
  onClose(): void;
}

export default function NewGoalDialog({ open, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const upsertGoal = useAppStore((s) => s.upsertGoal);
  const setActiveGoal = useAppStore((s) => s.setActiveGoal);
  const addTab = useAppStore((s) => s.addTab);

  useEffect(() => {
    if (open) {
      setTitle("");
      setObjective("");
      setError(null);
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), objective: objective.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to create goal");
      }
      const { goal } = (await res.json()) as { goal: Goal };
      upsertGoal(goal);
      setActiveGoal(goal.slug);
      addTab({
        id: crypto.randomUUID(),
        slug: goal.slug,
        title: goal.title,
        sessionId: null,
        status: "pending",
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-[480px] rounded border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] p-5"
      >
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)]">
            New goal
          </div>
          <h2 className="mt-1 text-[15px] font-semibold text-[var(--color-fg)]">
            Define a business outcome
          </h2>
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] text-[var(--color-fg-muted)]">Title</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Launch pricing page"
            className="w-full rounded border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2.5 py-1.5 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
          />
        </label>
        <label className="mb-3 block">
          <span className="mb-1 block text-[11px] text-[var(--color-fg-muted)]">
            Objective (the "why" — seeds plan.md)
          </span>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={4}
            placeholder="Ship a pricing page that converts cold ICP traffic ≥ 3%."
            className="w-full resize-none rounded border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-2.5 py-1.5 text-[13px] text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)]"
          />
        </label>
        {error ? (
          <div className="mb-3 rounded border border-[var(--color-danger)]/50 bg-[var(--color-danger)]/10 p-2 text-[11px] text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-[12px] text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-fg)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-bg)] hover:bg-[var(--color-accent-hi)] disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create goal"}
          </button>
        </div>
      </form>
    </div>
  );
}
