import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import {
  AddTransactionForm,
  type TransactionInitial,
} from "@/components/add-transaction-form";
import { Card } from "@/components/ui";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { id } = await params;

  const [user, categories, tx] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.transaction.findFirst({
      where: { id, userId },
      select: {
        id: true,
        type: true,
        amountCents: true,
        note: true,
        date: true,
        categoryId: true,
      },
    }),
  ]);
  if (!user) redirect("/login");
  if (!tx) notFound();

  const initial: TransactionInitial = {
    id: tx.id,
    type: tx.type,
    amountCents: tx.amountCents,
    note: tx.note,
    date: tx.date.toISOString(),
    categoryId: tx.categoryId,
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-3">
          <Link
            href="/operations"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Modifier l&apos;opération</h1>
        </div>

        <Card>
          <AddTransactionForm
            categories={categories}
            currency={user.currency}
            initial={initial}
          />
        </Card>
      </div>
    </AppShell>
  );
}
