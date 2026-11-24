import { redirect } from "next/navigation";
import { Crown, Check, X } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlanStatus } from "@/lib/subscription";
import { PRICE_MONTHLY_CENTS, PRICE_ANNUAL_CENTS, PLAN_LABELS } from "@/lib/plans";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

const BENEFITS = [
  { label: "Portefeuilles illimités", free: false },
  { label: "Opérations illimitées", free: false },
  { label: "Budgets par catégorie", free: false },
  { label: "Statistiques avancées", free: false },
  { label: "Objectifs d'épargne illimités", free: false },
  { label: "Export des données", free: false },
];

export default async function SubscriptionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, status, history] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    }),
    getPlanStatus(userId),
    prisma.subscription.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
  ]);
  if (!user) redirect("/login");

  const currency = user.currency;
  const premium = status.premium;

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Abonnement</h1>

        {/* Statut actuel */}
        <Card className={premium ? "gradient-primary text-white" : ""}>
          <div className="flex items-center gap-3">
            <span
              className={
                premium
                  ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"
                  : "flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
              }
            >
              <Crown className="h-6 w-6" />
            </span>
            <div>
              <p className={premium ? "text-sm text-white/80" : "text-sm text-muted"}>
                Plan actuel
              </p>
              <p className="text-xl font-bold">
                {premium ? "Premium" : "Gratuit"}
              </p>
            </div>
          </div>
          {premium && (
            <p className="mt-3 text-sm text-white/85">
              {status.grandfathered
                ? "Premium offert (membre des débuts) 🎉"
                : status.premiumUntil
                  ? `Actif jusqu'au ${status.premiumUntil.toLocaleDateString("fr-FR")}`
                  : "Actif"}
            </p>
          )}
        </Card>

        {/* Offre Premium */}
        {!premium && (
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold">Passez Premium</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border p-4 text-center">
                <p className="text-sm text-muted">Mensuel</p>
                <p className="mt-1 text-xl font-bold">
                  {formatMoney(PRICE_MONTHLY_CENTS, currency)}
                </p>
                <p className="text-xs text-muted">/ mois</p>
              </div>
              <div className="rounded-2xl border-2 border-primary p-4 text-center">
                <p className="text-sm font-medium text-primary">Annuel</p>
                <p className="mt-1 text-xl font-bold">
                  {formatMoney(PRICE_ANNUAL_CENTS, currency)}
                </p>
                <p className="text-xs text-muted">/ an · 2 mois offerts</p>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-surface-muted px-3 py-2 text-sm text-muted">
              💡 Paiement par Mobile Money bientôt disponible. En attendant,
              contacte l&apos;administrateur pour activer ton abonnement.
            </p>
          </Card>
        )}

        {/* Avantages */}
        <Card>
          <h2 className="mb-3 text-base font-bold">Avantages Premium</h2>
          <ul className="space-y-2">
            {BENEFITS.map((b) => (
              <li key={b.label} className="flex items-center gap-2 text-sm">
                {premium ? (
                  <Check className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-muted" />
                )}
                <span className={premium ? "" : "text-muted"}>{b.label}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Historique */}
        <Card>
          <h2 className="mb-3 text-base font-bold">Historique d&apos;abonnement</h2>
          {history.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">
              Aucun abonnement enregistré.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {PLAN_LABELS[s.plan]} · {PLAN_LABELS[s.cycle]}
                    </p>
                    <p className="text-xs text-muted">
                      {s.startedAt.toLocaleDateString("fr-FR")} →{" "}
                      {s.endsAt.toLocaleDateString("fr-FR")} · {s.note}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(s.priceCents, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
