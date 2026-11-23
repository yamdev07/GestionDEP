import Link from "next/link";
import { Wallet, Bell } from "lucide-react";
import { BottomNav, TopNavLinks } from "@/components/nav";

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      {/* En-tête */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="gradient-primary flex h-9 w-9 items-center justify-center rounded-xl text-white">
            <Wallet className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">MonBudget</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <TopNavLinks />
        </nav>

        <Link
          href="/operations"
          title="Opérations"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
        </Link>
      </header>

      {/* Contenu */}
      <main className="flex-1 px-4 py-5 pb-28 sm:pb-8">{children}</main>

      {/* Navigation mobile + FAB */}
      <BottomNav />
    </div>
  );
}
