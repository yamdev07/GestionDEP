import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultAccount } from "@/lib/actions/accounts";
import { AppShell } from "@/components/app-shell";
import {
  AccountManager,
  type AccountRowData,
} from "@/components/account-manager";

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Crée « Espèces » et rattache l'historique au premier passage.
  await ensureDefaultAccount(userId);

  const [user, accounts, grouped] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    }),
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, accountId: { not: null } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
  ]);
  if (!user) redirect("/login");

  // Agrège revenus/dépenses et nombre d'opérations par compte.
  const stats = new Map<
    string,
    { income: number; expense: number; count: number }
  >();
  for (const g of grouped) {
    if (!g.accountId) continue;
    const s = stats.get(g.accountId) ?? { income: 0, expense: 0, count: 0 };
    const amount = g._sum.amountCents ?? 0;
    if (g.type === "INCOME") s.income += amount;
    else s.expense += amount;
    s.count += g._count._all;
    stats.set(g.accountId, s);
  }

  const rows: AccountRowData[] = accounts.map((a) => {
    const s = stats.get(a.id) ?? { income: 0, expense: 0, count: 0 };
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      color: a.color,
      balanceCents: a.initialBalanceCents + s.income - s.expense,
      txCount: s.count,
    };
  });

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Comptes</h1>
          <p className="text-sm text-muted">
            Espèces, Mobile Money, banque… chacun avec son solde.
          </p>
        </div>
        <AccountManager accounts={rows} currency={user.currency} />
      </div>
    </AppShell>
  );
}
