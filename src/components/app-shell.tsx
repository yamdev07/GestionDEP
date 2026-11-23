import Link from "next/link";
import { Wallet } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { BottomNav, TopNavLinks } from "@/components/nav";

export function AppShell({
  userName,
  children,
}: {
  userName?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      {/* En-tête */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </span>
          <span className="font-semibold">Mes Dépenses</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <TopNavLinks />
        </nav>

        <div className="flex items-center gap-2">
          {userName && (
            <span className="hidden text-sm text-muted sm:inline">
              {userName}
            </span>
          )}
          <SignOutButton />
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 px-4 py-5 pb-24 sm:pb-8">{children}</main>

      {/* Navigation mobile */}
      <BottomNav />
    </div>
  );
}
