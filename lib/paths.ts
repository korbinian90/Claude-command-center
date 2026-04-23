import os from "node:os";
import path from "node:path";

export { LANES, type Lane } from "./lanes";

export function agentRoot(): string {
  const fromEnv = process.env.AGENT_ROOT;
  if (fromEnv && fromEnv.trim().length > 0) {
    return path.resolve(fromEnv);
  }
  return path.join(os.homedir(), ".command-center");
}

export function memoryDir(root = agentRoot()): string {
  return path.join(root, "memory");
}

export function brandContextDir(root = agentRoot()): string {
  return path.join(root, "memory", "brand_context");
}

export function projectsDir(root = agentRoot()): string {
  return path.join(root, "projects");
}

export function projectDir(slug: string, root = agentRoot()): string {
  return path.join(root, "projects", slug);
}

export function planPath(slug: string, root = agentRoot()): string {
  return path.join(root, "projects", slug, "plan.md");
}

export function statePath(slug: string, root = agentRoot()): string {
  return path.join(root, "projects", slug, "state.json");
}

export function skillsDir(root = agentRoot()): string {
  return path.join(root, "skills");
}

export function reviewDir(root = agentRoot()): string {
  return path.join(root, "review");
}

export function claudeMdPath(root = agentRoot()): string {
  return path.join(root, "CLAUDE.md");
}

export function userMdPath(root = agentRoot()): string {
  return path.join(root, "memory", "user.md");
}
