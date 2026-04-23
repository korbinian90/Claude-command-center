import type { Stats } from "node:fs";
import path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { agentRoot, projectsDir, reviewDir } from "../lib/paths";
import type { WsRouter } from "./ws-router";

// Scope watching tightly. Each project folder can contain a full repo; watching
// the whole AGENT_ROOT recursively would be expensive (high FD + CPU usage)
// when only three kinds of events matter: plan.md / state.json / review/*.
export function startWatchers(router: WsRouter): FSWatcher {
  const root = agentRoot();
  const projRoot = projectsDir(root);
  const revRoot = reviewDir(root);

  const watcher = chokidar.watch([projRoot, revRoot], {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    persistent: true,
    depth: 2,
    ignored: (p: string, stats?: Stats) => {
      // Keep the two roots themselves so chokidar can walk them.
      if (p === projRoot || p === revRoot) return false;
      // Projects subtree: allow <projRoot>/<slug> (dir) and its plan.md / state.json.
      if (p.startsWith(projRoot + path.sep)) {
        const parts = path.relative(projRoot, p).split(path.sep);
        if (parts.length === 1) return false;
        if (parts.length === 2 && (parts[1] === "plan.md" || parts[1] === "state.json")) {
          return false;
        }
        return true;
      }
      // Review subtree: allow only files directly under revRoot. Reject any
      // deeper path and any top-level subdirectory so chokidar does not
      // descend into it (important when stats is provided on enumeration).
      if (p.startsWith(revRoot + path.sep)) {
        const rel = path.relative(revRoot, p);
        if (rel.includes(path.sep)) return true;
        if (stats?.isDirectory()) return true;
        return false;
      }
      return true;
    },
  });

  function inProjects(p: string): boolean {
    return p.startsWith(projRoot + path.sep);
  }
  function inReview(p: string): boolean {
    return p.startsWith(revRoot + path.sep);
  }

  function classify(absPath: string): void {
    if (inProjects(absPath)) {
      const parts = path.relative(projRoot, absPath).split(path.sep);
      if (parts.length === 2 && parts[1] === "plan.md") {
        router.broadcast({ type: "plan:updated", slug: parts[0] });
      } else if (parts.length === 2 && parts[1] === "state.json") {
        router.broadcast({ type: "goal:updated", slug: parts[0] });
      }
      return;
    }
    if (inReview(absPath)) {
      const name = path.relative(revRoot, absPath);
      if (!name.includes(path.sep)) {
        router.broadcast({ type: "review:new", path: absPath, name });
      }
    }
  }

  watcher.on("add", classify);
  watcher.on("change", classify);
  watcher.on("unlink", (p) => {
    if (!inProjects(p)) return;
    const parts = path.relative(projRoot, p).split(path.sep);
    if (parts.length !== 2) return;
    if (parts[1] === "state.json") {
      router.broadcast({ type: "goal:updated", slug: null });
    } else if (parts[1] === "plan.md") {
      router.broadcast({ type: "plan:updated", slug: parts[0] });
    }
  });
  watcher.on("unlinkDir", (p) => {
    // A project folder was removed.
    if (!inProjects(p)) return;
    const parts = path.relative(projRoot, p).split(path.sep);
    if (parts.length === 1) router.broadcast({ type: "goal:updated", slug: null });
  });

  return watcher;
}
