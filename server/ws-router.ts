import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, WebSocket } from "ws";
import { isValidSlug } from "../lib/slug";
import type { ClientMessage, ServerMessage } from "../lib/ws-types";
import { ptyManager } from "./pty-manager";

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* socket raced to close */
  }
}

export interface WsRouter {
  wss: WebSocketServer;
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, selfOrigin: string): void;
  broadcast(msg: ServerMessage): void;
  closeAll(): void;
}

export function createWsRouter(token: string): WsRouter {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();
  const sessionsByClient = new WeakMap<WebSocket, Set<string>>();

  const unsubscribeData = ptyManager.onData((sessionId, data) => {
    const msg: ServerMessage = { type: "stdout", sessionId, data };
    for (const ws of clients) {
      const owned = sessionsByClient.get(ws);
      if (owned?.has(sessionId)) send(ws, msg);
    }
  });

  const unsubscribeExit = ptyManager.onExit((sessionId, code) => {
    const msg: ServerMessage = { type: "exit", sessionId, code };
    for (const ws of clients) {
      const owned = sessionsByClient.get(ws);
      if (owned?.has(sessionId)) {
        send(ws, msg);
        owned.delete(sessionId);
      }
    }
  });

  wss.on("connection", (ws) => {
    clients.add(ws);
    sessionsByClient.set(ws, new Set());

    ws.on("message", (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        send(ws, { type: "error", message: "invalid json" });
        return;
      }
      const owned = sessionsByClient.get(ws)!;
      try {
        switch (msg.type) {
          case "spawn": {
            if (!isValidSlug(msg.slug)) {
              send(ws, {
                type: "error",
                message: "invalid slug",
                clientId: msg.clientId,
              });
              return;
            }
            try {
              const session = ptyManager.spawn({
                slug: msg.slug,
                cols: msg.cols,
                rows: msg.rows,
              });
              owned.add(session.id);
              send(ws, {
                type: "spawned",
                sessionId: session.id,
                slug: msg.slug,
                clientId: msg.clientId,
              });
            } catch (e) {
              const err = e as Error;
              send(ws, {
                type: "error",
                message: `spawn failed: ${err.message}`,
                clientId: msg.clientId,
              });
            }
            break;
          }
          case "stdin": {
            if (!owned.has(msg.sessionId)) return;
            ptyManager.write(msg.sessionId, msg.data);
            break;
          }
          case "resize": {
            if (!owned.has(msg.sessionId)) return;
            ptyManager.resize(msg.sessionId, msg.cols, msg.rows);
            break;
          }
          case "close": {
            if (!owned.has(msg.sessionId)) return;
            ptyManager.kill(msg.sessionId);
            owned.delete(msg.sessionId);
            break;
          }
        }
      } catch (e) {
        const err = e as Error;
        send(ws, { type: "error", message: err.message });
      }
    });

    ws.on("close", () => {
      const owned = sessionsByClient.get(ws);
      if (owned) for (const id of owned) ptyManager.kill(id);
      clients.delete(ws);
    });
  });

  function handleUpgrade(
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
    selfOrigin: string,
  ): void {
    const url = new URL(req.url ?? "/", selfOrigin);
    const qToken = url.searchParams.get("token");
    const origin = req.headers.origin ?? "";

    if (qToken !== token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    if (origin && origin !== selfOrigin) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  }

  function broadcast(msg: ServerMessage): void {
    for (const ws of clients) send(ws, msg);
  }

  function closeAll(): void {
    unsubscribeData();
    unsubscribeExit();
    for (const ws of clients) ws.close();
    clients.clear();
    wss.close();
  }

  return { wss, handleUpgrade, broadcast, closeAll };
}
