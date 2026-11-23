"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListOrdered, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Accueil", icon: LayoutDashboard },
  { href: "/depenses", label: "Dépenses", icon: ListOrdered },
  { href: "/categories", label: "Catégories", icon: Tag },
];

export function TopNavLinks() {
  const pathname = usePathname();
  return (
    <>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
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
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/90 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-3xl">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition",
                active ? "text-primary" : "text-muted",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
