import { redirect } from "next/navigation";
import { ShieldCheck, Crown, Users, Banknote } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, getAdminEmail } from "@/lib/admin";
import { effectivePlan } from "@/lib/subscription";
import { SAAS_LAUNCH, PLANS, planRank } from "@/lib/plans";
import { AppShell } from "@/components/app-shell";
import { AdminUsers, type AdminUserRow } from "@/components/admin-users";
import { SignupsChart, RevenueChart, PlanDonut } from "@/components/admin-charts";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const adminEmail = getAdminEmail();

  const [users, grouped, subs, paid, paymentsList] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        createdAt: true,
        plan: true,
        planUntil: true,
        _count: { select: { transactions: true, accounts: true } },
      },
    }),
    prisma.transaction.groupBy({
      by: ["userId", "type"],
      _sum: { amountCents: true },
    }),
    prisma.subscription.findMany({ orderBy: { startedAt: "desc" } }),
    prisma.payment.aggregate({
      where: { status: "APPROVED" },
      _sum: { amountCents: true },
    }),
    prisma.payment.findMany({
      where: { status: "APPROVED" },
      select: { amountCents: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const sums = new Map<string, { income: number; expense: number }>();
  for (const g of grouped) {
    const s = sums.get(g.userId) ?? { income: 0, expense: 0 };
    const amount = g._sum.amountCents ?? 0;
    if (g.type === "INCOME") s.income += amount;
    else s.expense += amount;
    sums.set(g.userId, s);
  }

  const subsByUser = new Map<string, typeof subs>();
  for (const s of subs) {
    const list = subsByUser.get(s.userId) ?? [];
    list.push(s);
    subsByUser.set(s.userId, list);
  }

  const rows: AdminUserRow[] = users.map((u) => {
    const s = sums.get(u.id) ?? { income: 0, expense: 0 };
    const grandfathered = u.createdAt.getTime() < SAAS_LAUNCH.getTime();
    const plan = effectivePlan(u);
    const rank = planRank(plan);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      currency: u.currency,
      createdAt: u.createdAt.toISOString(),
      txCount: u._count.transactions,
      accountCount: u._count.accounts,
      incomeCents: s.income,
      expenseCents: s.expense,
      isAdmin: u.email.trim().toLowerCase() === adminEmail,
      plan,
      rank,
      grandfathered,
      planUntil: u.planUntil ? u.planUntil.toISOString() : null,
      subscriptions: (subsByUser.get(u.id) ?? []).map((x) => ({
        id: x.id,
        plan: x.plan,
        cycle: x.cycle,
        priceCents: x.priceCents,
        startedAt: x.startedAt.toISOString(),
        endsAt: x.endsAt.toISOString(),
        status: x.status,
        note: x.note,
      })),
    };
  });

  const refCurrency = rows[0]?.currency ?? "XOF";
  const payantsCount = rows.filter((r) => r.rank >= 1 && !r.grandfathered).length;
  const totalBilled = paid._sum.amountCents ?? 0;
  // MRR : seuls les payants (hors offerts) comptent.
  const mrr = rows.reduce(
    (sum, r) =>
      r.rank >= 1 && !r.grandfathered
        ? sum + (PLANS[r.plan as keyof typeof PLANS]?.monthlyCents ?? 0)
        : sum,
    0,
  );

  // --- Données des graphiques : 12 derniers mois ---
  const chartNow = new Date();
  const monthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const monthBuckets: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(chartNow.getFullYear(), chartNow.getMonth() - i, 1);
    monthBuckets.push({
      key: monthKey(d),
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
    });
  }
  const bucketIndex = new Map(monthBuckets.map((m, i) => [m.key, i]));

  const signups = monthBuckets.map((m) => ({ label: m.label, count: 0 }));
  for (const u of users) {
    const i = bucketIndex.get(monthKey(u.createdAt));
    if (i !== undefined) signups[i].count += 1;
  }

  const revenue = monthBuckets.map((m) => ({ label: m.label, cents: 0 }));
  for (const p of paymentsList) {
    const i = bucketIndex.get(monthKey(p.createdAt));
    if (i !== undefined) revenue[i].cents += p.amountCents;
  }

  // Répartition par plan effectif (palette validée CVD : bleu / amber / rose).
  const planCounts = { GRATUIT: 0, ESSENTIEL: 0, PREMIUM: 0 };
  for (const r of rows) {
    if (r.plan === "ESSENTIEL") planCounts.ESSENTIEL += 1;
    else if (r.plan === "PREMIUM") planCounts.PREMIUM += 1;
    else planCounts.GRATUIT += 1;
  }
  const planSlices = [
    { name: "Gratuit", value: planCounts.GRATUIT, color: "#3b82f6" },
    { name: "Essentiel", value: planCounts.ESSENTIEL, color: "#d97706" },
    { name: "Premium", value: planCounts.PREMIUM, color: "#db2777" },
  ].filter((s) => s.value > 0);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Administration</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat icon={<Users className="h-4 w-4" />} label="Comptes" value={String(rows.length)} />
          <MiniStat icon={<Crown className="h-4 w-4" />} label="Payants" value={String(payantsCount)} tone="primary" />
          <MiniStat icon={<Banknote className="h-4 w-4" />} label="MRR (est.)" value={formatMoney(mrr, refCurrency)} tone="success" />
          <MiniStat icon={<Banknote className="h-4 w-4" />} label="Encaissé (FedaPay)" value={formatMoney(totalBilled, refCurrency)} tone="success" />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Inscriptions (12 mois)
            </h2>
            <SignupsChart data={signups} />
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Encaissements (12 mois)
            </h2>
            <RevenueChart data={revenue} currency={refCurrency} />
          </Card>
          <Card className="lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Répartition des comptes par plan
            </h2>
            <PlanDonut data={planSlices} />
          </Card>
        </div>

        <AdminUsers rows={rows} />
      </div>
    </AppShell>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "success" | "primary";
}) {
  const color =
    tone === "success"
      ? "var(--success)"
      : tone === "primary"
        ? "var(--primary)"
        : "var(--foreground)";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 text-base font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </Card>
  );
}
