import { promises as fs } from "node:fs";
import path from "node:path";
import {
  agentRoot,
  brandContextDir,
  claudeMdPath,
  LANES,
  memoryDir,
  planPath,
  projectDir,
  projectsDir,
  reviewDir,
  skillsDir,
  statePath,
  userMdPath,
  type Lane,
} from "../lib/paths";
import { isValidSlug, slugify } from "../lib/slug";

const TEMPLATES = path.join(process.cwd(), "templates");

export interface GoalState {
  slug: string;
  title: string;
  lane: Lane;
  createdAt: string;
  updatedAt: string;
}

async function readTemplate(name: string): Promise<string> {
  return fs.readFile(path.join(TEMPLATES, name), "utf8");
}

async function writeIfMissing(file: string, content: string): Promise<void> {
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, "utf8");
  }
}

export async function ensureAgentRoot(): Promise<string> {
  const root = agentRoot();
  await fs.mkdir(root, { recursive: true });
  await fs.mkdir(memoryDir(root), { recursive: true });
  await fs.mkdir(brandContextDir(root), { recursive: true });
  await fs.mkdir(projectsDir(root), { recursive: true });
  await fs.mkdir(skillsDir(root), { recursive: true });
  await fs.mkdir(reviewDir(root), { recursive: true });

  await writeIfMissing(claudeMdPath(root), await readTemplate("CLAUDE.md.tmpl"));
  await writeIfMissing(userMdPath(root), await readTemplate("user.md.tmpl"));
  await writeIfMissing(
    path.join(brandContextDir(root), "voice.md"),
    await readTemplate("brand_voice.md.tmpl"),
  );
  await writeIfMissing(
    path.join(brandContextDir(root), "icp.md"),
    await readTemplate("brand_icp.md.tmpl"),
  );
  await writeIfMissing(
    path.join(brandContextDir(root), "positioning.md"),
    await readTemplate("brand_positioning.md.tmpl"),
  );

  return root;
}

export async function listGoals(): Promise<GoalState[]> {
  const dir = projectsDir();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const goals: GoalState[] = [];
  for (const slug of entries) {
    const state = await readGoal(slug);
    if (state) goals.push(state);
  }
  goals.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return goals;
}

export async function readGoal(slug: string): Promise<GoalState | null> {
  if (!isValidSlug(slug)) return null;
  try {
    const raw = await fs.readFile(statePath(slug), "utf8");
    const parsed = JSON.parse(raw) as Partial<GoalState>;
    if (!parsed.slug || !parsed.title || !parsed.lane) return null;
    if (!LANES.includes(parsed.lane as Lane)) return null;
    return {
      slug: parsed.slug,
      title: parsed.title,
      lane: parsed.lane as Lane,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function createGoal(title: string, objective: string): Promise<GoalState> {
  const baseSlug = slugify(title) || "goal";
  let slug = baseSlug;
  let n = 2;
  while (await goalExists(slug)) {
    slug = `${baseSlug}-${n++}`;
  }
  const now = new Date().toISOString();
  const state: GoalState = {
    slug,
    title,
    lane: "Active",
    createdAt: now,
    updatedAt: now,
  };
  await fs.mkdir(projectDir(slug), { recursive: true });
  const planTmpl = await readTemplate("plan.md.tmpl");
  const plan = planTmpl
    .replace("{{OBJECTIVE}}", objective || title)
    .replace("{{CREATED_AT}}", now.slice(0, 16).replace("T", " "));
  await fs.writeFile(planPath(slug), plan, "utf8");
  await fs.writeFile(statePath(slug), JSON.stringify(state, null, 2) + "\n", "utf8");
  return state;
}

export async function updateGoalLane(slug: string, lane: Lane): Promise<GoalState | null> {
  if (!isValidSlug(slug)) return null;
  const existing = await readGoal(slug);
  if (!existing) return null;
  const next: GoalState = { ...existing, lane, updatedAt: new Date().toISOString() };
  await fs.writeFile(statePath(slug), JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

export async function deleteGoal(slug: string): Promise<boolean> {
  if (!isValidSlug(slug)) return false;
  const dir = projectDir(slug);
  try {
    await fs.rm(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function readPlan(slug: string): Promise<string | null> {
  if (!isValidSlug(slug)) return null;
  try {
    return await fs.readFile(planPath(slug), "utf8");
  } catch {
    return null;
  }
}

export async function listReviewItems(): Promise<
  Array<{ name: string; path: string; mtime: string }>
> {
  const dir = reviewDir();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const items: Array<{ name: string; path: string; mtime: string }> = [];
  for (const name of entries) {
    const p = path.join(dir, name);
    try {
      const st = await fs.stat(p);
      if (st.isFile()) {
        items.push({ name, path: p, mtime: st.mtime.toISOString() });
      }
    } catch {
      /* ignore */
    }
  }
  items.sort((a, b) => b.mtime.localeCompare(a.mtime));
  return items;
}

async function goalExists(slug: string): Promise<boolean> {
  try {
    await fs.access(statePath(slug));
    return true;
  } catch {
    return false;
  }
}
