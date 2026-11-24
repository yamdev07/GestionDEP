"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseAmountToCents } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/transactions";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

function revalidateSavings() {
  revalidatePath("/");
  revalidatePath("/epargne");
}

const goalInput = z.object({
  name: z.string().trim().min(1, "Nom requis").max(60),
  color: z.string().trim().max(9).optional(),
  target: z.string().optional(),
  initial: z.string().optional(),
  deadline: z.string().optional(),
});

export async function createGoal(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const parsed = goalInput.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
    target: formData.get("target") || undefined,
    initial: formData.get("initial") || undefined,
    deadline: formData.get("deadline") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  const targetCents = parsed.data.target
    ? (parseAmountToCents(parsed.data.target) ?? 0)
    : 0;
  const savedCents = parsed.data.initial
    ? (parseAmountToCents(parsed.data.initial) ?? 0)
    : 0;
  const deadline = parsed.data.deadline
    ? new Date(parsed.data.deadline)
    : null;

  await prisma.savingsGoal.create({
    data: {
      userId,
      name: parsed.data.name,
      color: parsed.data.color ?? "#6d28d9",
      targetCents,
      savedCents,
      deadline: deadline && !isNaN(deadline.getTime()) ? deadline : null,
    },
  });

  revalidateSavings();
  return { ok: true };
}

/** Ajoute (montant > 0) ou retire (montant < 0) de l'épargne, sans descendre sous 0. */
export async function adjustGoal(
  goalId: string,
  amountInput: string,
  direction: "deposit" | "withdraw",
): Promise<ActionResult> {
  const userId = await requireUserId();

  const cents = parseAmountToCents(amountInput);
  if (cents === null || cents <= 0) {
    return { ok: false, error: "Montant invalide" };
  }

  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId },
    select: { savedCents: true },
  });
  if (!goal) return { ok: false, error: "Objectif introuvable" };

  const next =
    direction === "deposit"
      ? goal.savedCents + cents
      : Math.max(0, goal.savedCents - cents);

  await prisma.savingsGoal.updateMany({
    where: { id: goalId, userId },
    data: { savedCents: next },
  });

  revalidateSavings();
  return { ok: true };
}

export async function deleteGoal(goalId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.savingsGoal.deleteMany({ where: { id: goalId, userId } });
  revalidateSavings();
  return { ok: true };
}
