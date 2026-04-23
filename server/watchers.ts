import path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { agentRoot, projectsDir, reviewDir } from "../lib/paths";
import type { WsRouter } from "./ws-router";

export function startWatchers(router: WsRouter): FSWatcher {
  const root = agentRoot();
  const watcher = chokidar.watch(root, {
    ignored: (p) => /(^|[\\/])(node_modules|\.git)([\\/]|$)/.test(p),
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    persistent: true,
  });

  const projRoot = projectsDir(root);
  const revRoot = reviewDir(root);

  function classify(absPath: string): void {
    const rel = path.relative(root, absPath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return;

    if (absPath.startsWith(projRoot + path.sep)) {
      const parts = path.relative(projRoot, absPath).split(path.sep);
      if (parts.length === 2 && parts[1] === "plan.md") {
        router.broadcast({ type: "plan:updated", slug: parts[0] });
      } else if (parts.length === 2 && parts[1] === "state.json") {
        router.broadcast({ type: "goal:updated", slug: parts[0] });
      }
      return;
    }
    if (absPath.startsWith(revRoot + path.sep)) {
      const name = path.relative(revRoot, absPath);
      if (!name.includes(path.sep)) {
        router.broadcast({ type: "review:new", path: absPath, name });
      }
      return;
    }
  }

  watcher.on("add", classify);
  watcher.on("change", classify);
  watcher.on("unlink", (p) => {
    if (p.endsWith(path.sep + "state.json")) {
      router.broadcast({ type: "goal:updated", slug: null });
    }
    if (p.endsWith(path.sep + "plan.md")) {
      const parts = path.relative(projRoot, p).split(path.sep);
      if (parts.length === 2) router.broadcast({ type: "plan:updated", slug: parts[0] });
    }
  });
  watcher.on("unlinkDir", () => {
    router.broadcast({ type: "goal:updated", slug: null });
  });

  return watcher;
}
