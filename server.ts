import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import next from "next";
import { ensureAgentRoot } from "./server/fs-api";
import { ptyManager } from "./server/pty-manager";
import { runPreflight } from "./server/preflight";
import { startWatchers } from "./server/watchers";
import { createWsRouter } from "./server/ws-router";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT ?? 3000);
const dev = process.env.NODE_ENV !== "production";

async function main() {
  const root = await ensureAgentRoot();
  const pre = runPreflight();
  console.log(`\n  Claude Command Center`);
  console.log(`  agent root : ${root}`);
  console.log(`  claude CLI : ${pre.claudeCliPath ?? "(NOT FOUND)"}`);
  console.log(`  node       : v${pre.nodeVersion}`);
  for (const w of pre.warnings) console.log(`  !  ${w}`);

  const token = randomBytes(32).toString("hex");
  process.env.WS_TOKEN = token;
  process.env.CLAUDE_CLI_PATH = pre.claudeCliPath ?? "";

  const app = next({ dev, hostname: HOST, port: PORT });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = createServer((req, res) => {
    handle(req, res);
  });

  const selfOrigin = `http://${HOST}:${PORT}`;
  const router = createWsRouter(token);
  const watcher = startWatchers(router);

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", selfOrigin);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }
    router.handleUpgrade(req, socket, head, selfOrigin);
  });

  server.listen(PORT, HOST, () => {
    console.log(`\n  ready → ${selfOrigin}\n`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n  ${signal} received — shutting down`);
    try {
      ptyManager.killAll();
      router.closeAll();
      await watcher.close();
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 2000).unref();
    } catch {
      process.exit(1);
    }
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
