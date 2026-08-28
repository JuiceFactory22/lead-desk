import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { isAuthed } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Lead Desk",
  description: "Internal lead marketplace",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthed();

  return (
    <html lang="en">
      <body className="min-h-screen">
        {authed && (
          <header className="border-b border-line bg-white">
            <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/" className="font-semibold tracking-tight text-ink">Lead Desk</Link>
                <Link href="/" className="text-muted hover:text-ink">Leads</Link>
                <Link href="/contractors" className="text-muted hover:text-ink">Contractors</Link>
                <Link href="/territories" className="text-muted hover:text-ink">Territories</Link>
                <Link href="/discovered" className="text-muted hover:text-ink">Discovered</Link>
                <Link href="/leads/new" className="text-muted hover:text-ink">New lead</Link>
              </nav>
              <form action="/api/auth/logout" method="post">
                <button className="text-xs text-muted hover:text-ink">Log out</button>
              </form>
            </div>
          </header>
        )}
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
