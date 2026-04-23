import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Supervisor dashboard for the Claude Code CLI",
};

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
