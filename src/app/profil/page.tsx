import Link from "next/link";
import { redirect } from "next/navigation";
import { Tag, ListOrdered, Wallet, ShieldCheck, PiggyBank, Crown, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { getPlanStatus } from "@/lib/subscription";
import { PLAN_LABELS } from "@/lib/plans";
import { AppShell } from "@/components/app-shell";
import { ProfileForm } from "@/components/profile-form";
import { PasswordForm } from "@/components/password-form";
import { SignOutButton } from "@/components/sign-out-button";
import { Card } from "@/components/ui";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, currency: true },
  });
  if (!user) redirect("/login");

  const initial = (user.name || user.email || "?").slice(0, 1).toUpperCase();
  const admin = isAdmin(session.user.email);
  const plan = await getPlanStatus(userId);

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Profil</h1>

        {/* Carte identité */}
        <Card className="flex items-center gap-4">
          <span className="gradient-primary flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">
              {user.name || "Sans nom"}
            </p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </Card>

        {/* Préférences */}
        <Card>
          <h2 className="mb-4 text-base font-bold">Préférences</h2>
          <ProfileForm name={user.name ?? ""} currency={user.currency} />
        </Card>

        {/* Sécurité */}
        <Card>
          <h2 className="mb-4 text-base font-bold">Sécurité</h2>
          <PasswordForm />
        </Card>

        {/* Raccourcis */}
        <Card className="p-0">
          <Link
            href="/abonnement"
            className="flex items-center gap-3 px-5 py-4 transition hover:bg-surface-muted"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Crown className="h-5 w-5" />
            </span>
            <span className="flex-1 font-medium">Abonnement</span>
            <span
              className={
                plan.rank >= 1
                  ? "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                  : "rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted"
              }
            >
              {PLAN_LABELS[plan.plan] ?? "Gratuit"}
            </span>
            <ChevronRight className="h-5 w-5 text-muted" />
          </Link>
          <div className="border-t border-border" />
          {admin && (
            <>
              <LinkRow
                href="/admin"
                icon={<ShieldCheck className="h-5 w-5" />}
                label="Administration"
              />
              <div className="border-t border-border" />
            </>
          )}
          <LinkRow href="/comptes" icon={<Wallet className="h-5 w-5" />} label="Comptes" />
          <div className="border-t border-border" />
          <LinkRow href="/epargne" icon={<PiggyBank className="h-5 w-5" />} label="Épargne" />
          <div className="border-t border-border" />
          <LinkRow href="/categories" icon={<Tag className="h-5 w-5" />} label="Catégories" />
          <div className="border-t border-border" />
          <LinkRow
            href="/operations"
            icon={<ListOrdered className="h-5 w-5" />}
            label="Toutes les opérations"
          />
        </Card>

        <div className="pt-1">
          <SignOutButton />
        </div>
      </div>
    </AppShell>
  );
}

function LinkRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-5 py-4 transition hover:bg-surface-muted"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-foreground">
        {icon}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight className="h-5 w-5 text-muted" />
    </Link>
  );
}
