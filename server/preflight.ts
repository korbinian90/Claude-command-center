import { spawnSync } from "node:child_process";

export interface Preflight {
  claudeCliPath: string | null;
  nodeVersion: string;
  warnings: string[];
}

export function runPreflight(): Preflight {
  const warnings: string[] = [];
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["claude"], {
    encoding: "utf8",
  });
  const claudeCliPath =
    which.status === 0 && which.stdout.trim() ? which.stdout.trim().split(/\r?\n/)[0] : null;

  if (!claudeCliPath) {
    warnings.push(
      "`claude` CLI not found on PATH. Install it from https://claude.com/code before starting a session.",
    );
  }

  const [major] = process.versions.node.split(".").map(Number);
  if (major < 20) {
    warnings.push(`Node ${process.versions.node} detected; Node 20+ is required.`);
  }

  return { claudeCliPath, nodeVersion: process.versions.node, warnings };
}
