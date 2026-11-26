import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultAccount } from "@/lib/actions/accounts";
import { AppShell } from "@/components/app-shell";
import { BatchExpenseEntry } from "@/components/batch-expense-entry";
import { CategoryIcon } from "@/components/category-icon";

export default async function CategoryBatchEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { id } = await params;

  await ensureDefaultAccount(userId);

  const [user, category, accounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    }),
    prisma.category.findFirst({
      where: { id, userId },
      select: { id: true, name: true, color: true, icon: true },
    }),
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);
  if (!user) redirect("/login");
  if (!category) notFound();

  const recentRows = await prisma.transaction.findMany({
    where: { userId, categoryId: category.id, type: "EXPENSE" },
    orderBy: { date: "desc" },
    take: 15,
    select: { id: true, amountCents: true, date: true, note: true },
  });
  const recent = recentRows.map((t) => ({
    id: t.id,
    amountCents: t.amountCents,
    date: t.date.toISOString(),
    note: t.note,
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-3">
          <Link
            href="/categories"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <CategoryIcon
            icon={category.icon}
            color={category.color}
            className="h-10 w-10 shrink-0 rounded-xl"
            size={18}
          />
          <div>
            <h1 className="text-2xl font-bold leading-tight">{category.name}</h1>
            <p className="text-sm text-muted">
              Saisir des dépenses passées, l&apos;une après l&apos;autre.
            </p>
          </div>
        </div>

        <BatchExpenseEntry
          categoryId={category.id}
          accounts={accounts}
          currency={user.currency}
          recent={recent}
        />
      </div>
    </AppShell>
  );
}
