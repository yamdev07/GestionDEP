import { redirect } from "next/navigation";
import { Crown, Check } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlanStatus } from "@/lib/subscription";
import { PLANS, PLAN_LABELS, type PlanKey } from "@/lib/plans";
import { AppShell } from "@/components/app-shell";
import { SubscribeButton } from "@/components/subscribe-button";
import { Card } from "@/components/ui";
import { formatMoney, cn } from "@/lib/utils";

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  GRATUIT: ["1 portefeuille", "50 opérations / mois", "1 objectif d'épargne"],
  ESSENTIEL: [
    "Portefeuilles illimités",
    "Opérations illimitées",
    "Objectifs illimités",
    "Budgets par catégorie",
    "Statistiques avancées",
  ],
  PREMIUM: [
    "Tout l'Essentiel",
    "Export des données",
    "Partage familial (à venir)",
    "Support prioritaire",
  ],
};

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ pay?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { pay } = await searchParams;
  const payPlan: PlanKey | null =
    pay === "ESSENTIEL" || pay === "PREMIUM" ? pay : null;

  const [user, status, history] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
    getPlanStatus(userId),
    prisma.subscription.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
  ]);
  if (!user) redirect("/login");

  const currency = user.currency;
  const currentLabel = PLAN_LABELS[status.plan] ?? "Gratuit";

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Abonnement</h1>

        {/* Statut actuel */}
        <Card className={status.rank >= 1 ? "gradient-primary text-white" : ""}>
          <div className="flex items-center gap-3">
            <span
              className={
                status.rank >= 1
                  ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"
                  : "flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
              }
            >
              <Crown className="h-6 w-6" />
            </span>
            <div>
              <p className={status.rank >= 1 ? "text-sm text-white/80" : "text-sm text-muted"}>
                Plan actuel
              </p>
              <p className="text-xl font-bold">{currentLabel}</p>
            </div>
          </div>
          {status.rank >= 1 && (
            <p className="mt-3 text-sm text-white/85">
              {status.grandfathered
                ? "Premium offert (membre des débuts) 🎉"
                : status.planUntil
                  ? `Actif jusqu'au ${status.planUntil.toLocaleDateString("fr-FR")}`
                  : "Actif"}
            </p>
          )}
        </Card>

        {/* Invitation à finaliser le paiement du plan choisi sur la landing */}
        {payPlan && status.plan !== payPlan && (
          <div className="rounded-xl border border-primary bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            Finalise ton abonnement <strong>{PLAN_LABELS[payPlan]}</strong> :
            clique sur « Payer » dans la carte ci-dessous.
          </div>
        )}

        {/* Choix de plan */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(["ESSENTIEL", "PREMIUM"] as PlanKey[]).map((p) => (
            <Card
              key={p}
              className={cn(
                "flex flex-col",
                p === "PREMIUM" && "border-2 border-primary",
                p === payPlan && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              <h2 className="flex items-center gap-1.5 text-base font-bold">
                {p === "PREMIUM" && <Crown className="h-5 w-5 text-primary" />}
                {PLANS[p].label}
              </h2>
              <p className="mt-1 text-2xl font-extrabold">
                {formatMoney(PLANS[p].monthlyCents, currency)}
                <span className="text-sm font-medium text-muted"> / mois</span>
              </p>
              <p className="text-xs text-muted">
                ou {formatMoney(PLANS[p].annualCents, currency)} / an
              </p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                {PLAN_FEATURES[p].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2">
                <SubscribeButton plan={p} cycle="MENSUEL" label={`Payer ${formatMoney(PLANS[p].monthlyCents, currency)}/mois`} />
                <SubscribeButton plan={p} cycle="ANNUEL" variant="outline" label={`Annuel · ${formatMoney(PLANS[p].annualCents, currency)}`} />
              </div>
            </Card>
          ))}
        </div>

        <p className="rounded-xl bg-surface-muted px-3 py-2 text-center text-sm text-muted">
          Paiement sécurisé par FedaPay (Mobile Money &amp; carte).
        </p>

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
