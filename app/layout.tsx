import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Supervisor dashboard for the Claude Code CLI",
};

// WS_TOKEN is generated per-boot in server.ts and read at render time.
// Forcing dynamic rendering prevents Next from prerendering an empty/stale
// token into static HTML, which would break WebSocket auth in production.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const token = process.env.WS_TOKEN ?? "";
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="ws-token" content={token} />
      </head>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] font-sans">
        {children}
      </body>
    </html>
  );
}
