"use client";

import type { ClientMessage, ServerMessage } from "./ws-types";

type Listener = (msg: ServerMessage) => void;

class WsClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<(s: WsStatus) => void>();
  private queue: string[] = [];
  private status: WsStatus = "idle";
  private reconnectDelay = 500;
  private retries = 0;
  private stopped = false;
  private tokenMemo: string | null = null;

  ensureConnected(): void {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING))
      return;
    this.connect();
  }

  send(msg: ClientMessage): void {
    const payload = JSON.stringify(msg);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.queue.push(payload);
      this.ensureConnected();
    }
  }

  on(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  onStatus(cb: (s: WsStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  private setStatus(s: WsStatus): void {
    this.status = s;
    for (const cb of this.statusListeners) cb(s);
  }

  private token(): string | null {
    if (this.tokenMemo) return this.tokenMemo;
    if (typeof document === "undefined") return null;
    const el = document.querySelector<HTMLMetaElement>('meta[name="ws-token"]');
    this.tokenMemo = el?.content ?? null;
    return this.tokenMemo;
  }

  private connect(): void {
    if (this.stopped) return;
    const token = this.token();
    if (!token) {
      this.setStatus("error");
      return;
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
    this.setStatus("connecting");
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.retries = 0;
      this.reconnectDelay = 500;
      this.setStatus("open");
      const q = this.queue.splice(0);
      for (const p of q) ws.send(p);
    });
    ws.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data) as ServerMessage;
        for (const cb of this.listeners) cb(msg);
      } catch {
        /* ignore */
      }
    });
    ws.addEventListener("close", () => {
      this.ws = null;
      this.setStatus("closed");
      if (this.stopped) return;
      this.retries += 1;
      const delay = Math.min(this.reconnectDelay * 2 ** Math.min(this.retries, 5), 10000);
      setTimeout(() => this.connect(), delay);
    });
    ws.addEventListener("error", () => {
      this.setStatus("error");
    });
  }
}

export type WsStatus = "idle" | "connecting" | "open" | "closed" | "error";

let singleton: WsClient | null = null;
export function wsClient(): WsClient {
  if (!singleton) singleton = new WsClient();
  return singleton;
}
