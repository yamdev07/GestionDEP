import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import {
  TransactionRow,
  type TransactionView,
} from "@/components/transaction-row";
import { Card } from "@/components/ui";
import { cn, formatMoney } from "@/lib/utils";
import { toTransactionView } from "@/lib/views";

type Filter = "all" | "income" | "expense";

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { f } = await searchParams;
  const filter: Filter =
    f === "income" ? "income" : f === "expense" ? "expense" : "all";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  if (!user) redirect("/login");

  const where = {
    userId,
    ...(filter === "income"
      ? { type: "INCOME" as const }
      : filter === "expense"
        ? { type: "EXPENSE" as const }
        : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: 300,
    include: { category: { select: { name: true, color: true, icon: true } } },
  });

  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amountCents, 0);
  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amountCents, 0);

  const views: TransactionView[] = transactions.map(toTransactionView);

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Opérations</h1>
          <p className="text-sm text-muted">
            {views.length} opération{views.length > 1 ? "s" : ""} ·{" "}
            <span className="text-success">+{formatMoney(income, user.currency)}</span>{" "}
            ·{" "}
            <span className="text-danger">-{formatMoney(expense, user.currency)}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <FilterChip href="/operations" active={filter === "all"} label="Toutes" />
          <FilterChip
            href="/operations?f=income"
            active={filter === "income"}
            label="Entrées"
          />
          <FilterChip
            href="/operations?f=expense"
            active={filter === "expense"}
            label="Dépenses"
          />
        </div>

        <Card>
          {views.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Aucune opération dans cette vue.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {views.map((t) => (
                <TransactionRow
                  key={t.id}
                  tx={t}
                  currency={user.currency}
                  deletable
                  editable
                />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-foreground hover:bg-surface-muted",
      )}
    >
      {label}
    </Link>
  );
}
