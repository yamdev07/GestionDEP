import { redirect } from "next/navigation";
import { ShieldCheck, Crown, Users, Banknote } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, getAdminEmail } from "@/lib/admin";
import { computeIsPremium } from "@/lib/subscription";
import { SAAS_LAUNCH, PRICE_MONTHLY_CENTS } from "@/lib/plans";
import { AppShell } from "@/components/app-shell";
import { AdminUsers, type AdminUserRow } from "@/components/admin-users";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const adminEmail = getAdminEmail();

  const [users, grouped, subs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        createdAt: true,
        premiumUntil: true,
        _count: { select: { transactions: true, accounts: true } },
      },
    }),
    prisma.transaction.groupBy({
      by: ["userId", "type"],
      _sum: { amountCents: true },
    }),
    prisma.subscription.findMany({ orderBy: { startedAt: "desc" } }),
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
    const premium = computeIsPremium(u);
    const grandfathered = u.createdAt.getTime() < SAAS_LAUNCH.getTime();
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
      premium,
      grandfathered,
      premiumUntil: u.premiumUntil ? u.premiumUntil.toISOString() : null,
      subscriptions: (subsByUser.get(u.id) ?? []).map((x) => ({
        id: x.id,
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
  const premiumCount = rows.filter((r) => r.premium).length;
  const totalBilled = subs.reduce((a, s) => a + s.priceCents, 0);
  const mrr = premiumCount * PRICE_MONTHLY_CENTS;

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Administration</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat icon={<Users className="h-4 w-4" />} label="Comptes" value={String(rows.length)} />
          <MiniStat icon={<Crown className="h-4 w-4" />} label="Premium" value={String(premiumCount)} tone="primary" />
          <MiniStat icon={<Banknote className="h-4 w-4" />} label="MRR (est.)" value={formatMoney(mrr, refCurrency)} tone="success" />
          <MiniStat icon={<Banknote className="h-4 w-4" />} label="Total encaissé" value={formatMoney(totalBilled, refCurrency)} tone="success" />
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
      <div className="flex items-center gap-1.5 text-muted" style={{ color }}>
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 text-base font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </Card>
  );
}
