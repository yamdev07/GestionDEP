import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultAccount } from "@/lib/actions/accounts";
import { AppShell } from "@/components/app-shell";
import { AddTransactionForm } from "@/components/add-transaction-form";
import { Card } from "@/components/ui";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { type } = await searchParams;
  const defaultType = type === "income" ? "INCOME" : "EXPENSE";

  await ensureDefaultAccount(userId);

  const [user, categories, accounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);
  if (!user) redirect("/login");

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Nouvelle opération</h1>
        </div>

        <Card>
          <AddTransactionForm
            categories={categories}
            accounts={accounts}
            currency={user.currency}
            defaultType={defaultType}
          />
        </Card>
      </div>
    </AppShell>
  );
}
