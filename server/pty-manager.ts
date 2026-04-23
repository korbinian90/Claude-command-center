import { randomUUID } from "node:crypto";
import { agentRoot, projectDir } from "../lib/paths";

type PtyHandle = {
  pid: number;
  cols: number;
  rows: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): void;
  onData(cb: (data: string) => void): { dispose(): void };
  onExit(cb: (e: { exitCode: number; signal?: number }) => void): { dispose(): void };
};

// Lazy require so a missing native module doesn't crash module import.
type PtyModule = {
  spawn(
    file: string,
    args: string[],
    opts: {
      name?: string;
      cols?: number;
      rows?: number;
      cwd?: string;
      env?: NodeJS.ProcessEnv;
    },
  ): PtyHandle;
};

let ptyModule: PtyModule | null = null;
let ptyLoadError: Error | null = null;

function loadPty(): PtyModule {
  if (ptyModule) return ptyModule;
  if (ptyLoadError) throw ptyLoadError;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ptyModule = require("node-pty") as PtyModule;
    return ptyModule;
  } catch (e) {
    ptyLoadError = e as Error;
    throw ptyLoadError;
  }
}

export interface Session {
  id: string;
  slug: string;
  pty: PtyHandle;
  createdAt: string;
}

type DataListener = (sessionId: string, data: string) => void;
type ExitListener = (sessionId: string, code: number) => void;

class PtyManager {
  private sessions = new Map<string, Session>();
  private dataListeners = new Set<DataListener>();
  private exitListeners = new Set<ExitListener>();

  spawn(params: { slug: string; cols: number; rows: number; command?: string }): Session {
    const pty = loadPty();
    const { slug, cols, rows, command = "claude" } = params;
    const cwd = projectDir(slug);
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      CLAUDE_PROJECT: slug,
      AGENT_ROOT: agentRoot(),
      TERM: "xterm-256color",
      FORCE_COLOR: "1",
    };

    const handle = pty.spawn(command, [], {
      name: "xterm-256color",
      cols: Math.max(20, cols | 0),
      rows: Math.max(5, rows | 0),
      cwd,
      env,
    });

    const id = randomUUID();
    const session: Session = {
      id,
      slug,
      pty: handle,
      createdAt: new Date().toISOString(),
    };

    handle.onData((data) => {
      for (const cb of this.dataListeners) cb(id, data);
    });
    handle.onExit(({ exitCode }) => {
      this.sessions.delete(id);
      for (const cb of this.exitListeners) cb(id, exitCode);
    });

    this.sessions.set(id, session);
    return session;
  }

  write(id: string, data: string): void {
    const s = this.sessions.get(id);
    if (s) s.pty.write(data);
  }

  resize(id: string, cols: number, rows: number): void {
    const s = this.sessions.get(id);
    if (s) s.pty.resize(Math.max(20, cols | 0), Math.max(5, rows | 0));
  }

  kill(id: string): void {
    const s = this.sessions.get(id);
    if (s) {
      try {
        s.pty.kill();
      } catch {
        /* ignore */
      }
      this.sessions.delete(id);
    }
  }

  killAll(): void {
    for (const id of Array.from(this.sessions.keys())) this.kill(id);
  }

  has(id: string): boolean {
    return this.sessions.has(id);
  }

  onData(cb: DataListener): () => void {
    this.dataListeners.add(cb);
    return () => this.dataListeners.delete(cb);
  }

  onExit(cb: ExitListener): () => void {
    this.exitListeners.add(cb);
    return () => this.exitListeners.delete(cb);
  }
}

export const ptyManager = new PtyManager();
