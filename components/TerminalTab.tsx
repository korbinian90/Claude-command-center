"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "../lib/store";
import { wsClient } from "../lib/ws-client";
import type { ServerMessage } from "../lib/ws-types";

interface Props {
  tabId: string;
  slug: string;
  active: boolean;
}

export default function TerminalTab({ tabId, slug, active }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pendingInputRef = useRef<string[]>([]);
  const updateTab = useAppStore((s) => s.updateTab);

  useEffect(() => {
    let disposed = false;
    const host = containerRef.current;
    if (!host) return;

    (async () => {
      const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/addon-web-links"),
      ]);
      if (disposed) return;

      const term = new Terminal({
        fontFamily: "ui-monospace, JetBrains Mono, Fira Code, Menlo, Consolas, monospace",
        fontSize: 13,
        lineHeight: 1.25,
        cursorBlink: true,
        allowProposedApi: true,
        scrollback: 5000,
        theme: {
          background: "#0a0b0d",
          foreground: "#e6e8eb",
          cursor: "#f2a900",
          cursorAccent: "#0a0b0d",
          selectionBackground: "#2a313a",
          black: "#0a0b0d",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#f2a900",
          blue: "#60a5fa",
          magenta: "#c084fc",
          cyan: "#22d3ee",
          white: "#e6e8eb",
          brightBlack: "#4b5563",
          brightRed: "#f87171",
          brightGreen: "#4ade80",
          brightYellow: "#fbbf24",
          brightBlue: "#93c5fd",
          brightMagenta: "#d8b4fe",
          brightCyan: "#67e8f9",
          brightWhite: "#f3f4f6",
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.loadAddon(new WebLinksAddon());
      term.open(host);
      fit.fit();
      terminalRef.current = term;
      fitRef.current = fit;

      const client = wsClient();
      client.ensureConnected();

      term.writeln("\x1b[2m  connecting to claude …\x1b[0m");
      const clientId = tabId;
      client.send({ type: "spawn", slug, cols: term.cols, rows: term.rows, clientId });

      const unsubscribe = client.on((msg: ServerMessage) => {
        if (msg.type === "spawned") {
          if (msg.clientId === clientId && !sessionIdRef.current) {
            sessionIdRef.current = msg.sessionId;
            updateTab(tabId, { sessionId: msg.sessionId, status: "open" });
            term.writeln("\x1b[2m  session " + msg.sessionId.slice(0, 8) + " ready\x1b[0m\r\n");
            const q = pendingInputRef.current.splice(0);
            for (const data of q) client.send({ type: "stdin", sessionId: msg.sessionId, data });
          }
        } else if (msg.type === "stdout") {
          if (msg.sessionId === sessionIdRef.current) term.write(msg.data);
        } else if (msg.type === "exit") {
          if (msg.sessionId === sessionIdRef.current) {
            term.writeln(`\r\n\x1b[31m  process exited (code ${msg.code})\x1b[0m`);
            updateTab(tabId, { status: "exited" });
          }
        } else if (msg.type === "error") {
          const mineByClient = msg.clientId === clientId;
          const mineBySession = msg.sessionId && msg.sessionId === sessionIdRef.current;
          if (mineByClient || mineBySession) {
            term.writeln(`\r\n\x1b[31m  error: ${msg.message}\x1b[0m`);
            if (mineByClient) updateTab(tabId, { status: "error" });
          }
        }
      });

      term.onData((data) => {
        const id = sessionIdRef.current;
        if (id) client.send({ type: "stdin", sessionId: id, data });
        else pendingInputRef.current.push(data);
      });

      const ro = new ResizeObserver(() => {
        try {
          fit.fit();
          const id = sessionIdRef.current;
          if (id) client.send({ type: "resize", sessionId: id, cols: term.cols, rows: term.rows });
        } catch {
          /* ignore */
        }
      });
      ro.observe(host);

      return () => {
        ro.disconnect();
        unsubscribe();
        const id = sessionIdRef.current;
        if (id) client.send({ type: "close", sessionId: id });
        term.dispose();
      };
    })();

    return () => {
      disposed = true;
      const id = sessionIdRef.current;
      if (id) {
        const client = wsClient();
        client.send({ type: "close", sessionId: id });
      }
      terminalRef.current?.dispose();
      terminalRef.current = null;
      fitRef.current = null;
      sessionIdRef.current = null;
    };
    // Mount-once per tab: we do NOT react to slug changes (tab is bound to one slug).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refit when this tab becomes active (layout may have changed while hidden).
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      try {
        fitRef.current?.fit();
        const term = terminalRef.current;
        const id = sessionIdRef.current;
        if (term && id) {
          wsClient().send({ type: "resize", sessionId: id, cols: term.cols, rows: term.rows });
        }
        term?.focus();
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ display: active ? "block" : "none", padding: "8px 4px 0 8px" }}
    />
  );
}
