import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { CategoryManager } from "@/components/category-manager";

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  if (!user) redirect("/login");

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      transactions: { select: { amountCents: true, type: true } },
    },
  });

  const views = categories.map((c) => {
    const expenses = c.transactions.filter((t) => t.type === "EXPENSE");
    return {
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      count: expenses.length,
      totalCents: expenses.reduce((s, e) => s + e.amountCents, 0),
    };
  });

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Catégories</h1>
          <p className="text-sm text-muted">
            Organise tes dépenses comme tu veux.
          </p>
        </div>
        <CategoryManager categories={views} currency={user.currency} />
      </div>
    </AppShell>
  );
}
