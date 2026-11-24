import { redirect } from "next/navigation";
import { PiggyBank } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import {
  SavingsManager,
  type GoalRowData,
} from "@/components/savings-manager";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function SavingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, goals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    }),
    prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!user) redirect("/login");

  const totalSaved = goals.reduce((s, g) => s + g.savedCents, 0);

  const rows: GoalRowData[] = goals.map((g) => ({
    id: g.id,
    name: g.name,
    color: g.color,
    targetCents: g.targetCents,
    savedCents: g.savedCents,
    deadline: g.deadline ? g.deadline.toISOString() : null,
  }));

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Épargne</h1>
          <p className="text-sm text-muted">Ce que tu mets de côté, objectif par objectif.</p>
        </div>

        <Card className="gradient-primary text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <PiggyBank className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm text-white/80">Total épargné</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatMoney(totalSaved, user.currency)}
              </p>
            </div>
          </div>
        </Card>

        <SavingsManager goals={rows} currency={user.currency} />
      </div>
    </AppShell>
  );
}
