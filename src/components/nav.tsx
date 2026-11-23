"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Target, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/profil", label: "Profil", icon: User },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function TopNavLinks() {
  const pathname = usePathname();
  return (
    <>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-surface-muted text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  // Deux liens à gauche, le FAB central, deux liens à droite.
  const left = LINKS.slice(0, 2);
  const right = LINKS.slice(2);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur sm:hidden">
      <div className="relative mx-auto flex max-w-3xl items-stretch">
        {left.map((l) => (
          <NavItem key={l.href} {...l} active={isActive(pathname, l.href)} />
        ))}

        {/* Emplacement du FAB central */}
        <div className="flex w-16 shrink-0 items-start justify-center">
          <Link
            href="/ajouter"
            aria-label="Ajouter une opération"
            className="gradient-primary -mt-5 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg shadow-primary/30 ring-4 ring-surface transition active:scale-95"
          >
            <Plus className="h-7 w-7" />
          </Link>
        </div>

        {right.map((l) => (
          <NavItem key={l.href} {...l} active={isActive(pathname, l.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
        active ? "text-primary" : "text-muted",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
