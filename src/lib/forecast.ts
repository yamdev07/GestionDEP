import { prisma } from "@/lib/prisma";

type Freq = "WEEKLY" | "MONTHLY" | "YEARLY";

function advance(date: Date, frequency: Freq): Date {
  const d = new Date(date);
  if (frequency === "WEEKLY") d.setDate(d.getDate() + 7);
  else if (frequency === "YEARLY") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

export type Upcoming = {
  incomeCents: number;
  expenseCents: number;
  occurrences: number;
};

/**
 * Somme des opérations récurrentes actives qui tomberont dans [from, to).
 * Sert au solde prévisionnel (Premium).
 */
export async function getUpcomingRecurring(
  userId: string,
  from: Date,
  to: Date,
): Promise<Upcoming> {
  const recs = await prisma.recurringTransaction.findMany({
    where: { userId, active: true, nextRunAt: { lt: to } },
    select: { type: true, amountCents: true, frequency: true, nextRunAt: true },
  });

  let incomeCents = 0;
  let expenseCents = 0;
  let occurrences = 0;

  for (const r of recs) {
    let next = new Date(r.nextRunAt);
    let guard = 0;
    while (next.getTime() < to.getTime() && guard < 400) {
      if (next.getTime() >= from.getTime()) {
        if (r.type === "INCOME") incomeCents += r.amountCents;
        else expenseCents += r.amountCents;
        occurrences++;
      }
      next = advance(next, r.frequency as Freq);
      guard++;
    }
  }

  return { incomeCents, expenseCents, occurrences };
}
