import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { ExpenseRow, type ExpenseView } from "@/components/expense-row";
import { Card } from "@/components/ui";
import { cn, formatMoney } from "@/lib/utils";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { cat } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  if (!user) redirect("/login");

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      ...(cat ? { categoryId: cat } : {}),
    },
    orderBy: { date: "desc" },
    take: 200,
    include: { category: { select: { name: true, color: true } } },
  });

  const total = expenses.reduce((s, e) => s + e.amountCents, 0);

  const views: ExpenseView[] = expenses.map((e) => ({
    id: e.id,
    amountCents: e.amountCents,
    note: e.note,
    date: e.date.toISOString(),
    categoryName: e.category?.name ?? null,
    categoryColor: e.category?.color ?? null,
  }));

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dépenses</h1>
            <p className="text-sm text-muted">
              {views.length} dépense{views.length > 1 ? "s" : ""} ·{" "}
              {formatMoney(total, user.currency)}
            </p>
          </div>
        </div>

        {/* Filtres par catégorie */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip href="/depenses" active={!cat} label="Toutes" />
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              href={`/depenses?cat=${c.id}`}
              active={cat === c.id}
              label={c.name}
              color={c.color}
            />
          ))}
        </div>

        <Card>
          {views.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Aucune dépense dans cette vue.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {views.map((e) => (
                <ExpenseRow key={e.id} expense={e} currency={user.currency} />
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
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-foreground hover:bg-surface-muted",
      )}
    >
      {color && (
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </Link>
  );
}
