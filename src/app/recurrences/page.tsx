import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlanStatus } from "@/lib/subscription";
import { canRecurring } from "@/lib/plans";
import { materializeRecurring } from "@/lib/actions/recurring";
import { AppShell } from "@/components/app-shell";
import { PremiumGate } from "@/components/premium-gate";
import {
  RecurringManager,
  type RecurringView,
} from "@/components/recurring-manager";

export default async function RecurrencesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, status] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
    getPlanStatus(userId),
  ]);
  if (!user) redirect("/login");

  if (!canRecurring(status.plan)) {
    return (
      <AppShell>
        <div className="space-y-5">
          <h1 className="text-2xl font-bold">Opérations récurrentes</h1>
          <PremiumGate
            title="Fonction Premium"
            description="Automatise ton loyer, ton salaire et tes abonnements : ils se créent tout seuls chaque semaine, mois ou année. Disponible avec le plan Premium."
          />
        </div>
      </AppShell>
    );
  }

  // Génère les occurrences dues avant d'afficher.
  await materializeRecurring(userId);

  const [categories, accounts, recurrings] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, icon: true },
    }),
    prisma.account.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: [{ active: "desc" }, { nextRunAt: "asc" }],
      include: {
        category: { select: { name: true, color: true, icon: true } },
        account: { select: { name: true } },
      },
    }),
  ]);

  const items: RecurringView[] = recurrings.map((r) => ({
    id: r.id,
    type: r.type,
    amountCents: r.amountCents,
    note: r.note,
    frequency: r.frequency,
    nextRunAt: r.nextRunAt.toISOString(),
    active: r.active,
    categoryName: r.category?.name ?? null,
    categoryColor: r.category?.color ?? null,
    categoryIcon: r.category?.icon ?? null,
    accountName: r.account?.name ?? null,
  }));

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Opérations récurrentes</h1>
          <p className="text-sm text-muted">
            Loyer, salaire, abonnements… créés automatiquement.
          </p>
        </div>
        <RecurringManager
          categories={categories}
          accounts={accounts}
          currency={user.currency}
          items={items}
        />
      </div>
    </AppShell>
  );
}
