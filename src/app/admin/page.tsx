import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, getAdminEmail } from "@/lib/admin";
import { AppShell } from "@/components/app-shell";
import { AdminUsers, type AdminUserRow } from "@/components/admin-users";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!isAdmin(session.user.email)) redirect("/");

  const adminEmail = getAdminEmail();

  const [users, grouped] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        createdAt: true,
        _count: { select: { transactions: true, accounts: true } },
      },
    }),
    prisma.transaction.groupBy({
      by: ["userId", "type"],
      _sum: { amountCents: true },
    }),
  ]);

  // Totaux revenus/dépenses par utilisateur.
  const sums = new Map<string, { income: number; expense: number }>();
  for (const g of grouped) {
    const s = sums.get(g.userId) ?? { income: 0, expense: 0 };
    const amount = g._sum.amountCents ?? 0;
    if (g.type === "INCOME") s.income += amount;
    else s.expense += amount;
    sums.set(g.userId, s);
  }

  const rows: AdminUserRow[] = users.map((u) => {
    const s = sums.get(u.id) ?? { income: 0, expense: 0 };
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
    };
  });

  const totalIncome = rows.reduce((a, r) => a + r.incomeCents, 0);
  const totalExpense = rows.reduce((a, r) => a + r.expenseCents, 0);
  const refCurrency = rows[0]?.currency ?? "XOF";

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Administration</h1>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Comptes" value={String(rows.length)} />
          <MiniStat
            label="Revenus cumulés"
            value={formatMoney(totalIncome, refCurrency)}
            tone="success"
          />
          <MiniStat
            label="Dépenses cumulées"
            value={formatMoney(totalExpense, refCurrency)}
            tone="danger"
          />
        </div>

        <AdminUsers rows={rows} />
      </div>
    </AppShell>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  const color =
    tone === "success"
      ? "var(--success)"
      : tone === "danger"
        ? "var(--danger)"
        : "var(--foreground)";
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p
        className="mt-1 text-base font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </p>
    </Card>
  );
}
