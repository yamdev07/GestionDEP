import { redirect } from "next/navigation";
import { ShieldCheck, Crown, Users, Banknote } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, getAdminEmail } from "@/lib/admin";
import { effectivePlan } from "@/lib/subscription";
import { SAAS_LAUNCH, PLANS, planRank } from "@/lib/plans";
import { AppShell } from "@/components/app-shell";
import { AdminUsers, type AdminUserRow } from "@/components/admin-users";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const adminEmail = getAdminEmail();

  const [users, grouped, subs, paid] = await Promise.all([
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

  let mrr = 0;
  const rows: AdminUserRow[] = users.map((u) => {
    const s = sums.get(u.id) ?? { income: 0, expense: 0 };
    const grandfathered = u.createdAt.getTime() < SAAS_LAUNCH.getTime();
    const plan = effectivePlan(u);
    const rank = planRank(plan);
    // MRR : seuls les payants (hors offerts) comptent.
    if (rank >= 1 && !grandfathered) {
      mrr += PLANS[plan as keyof typeof PLANS]?.monthlyCents ?? 0;
    }
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
