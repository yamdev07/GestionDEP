"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseAmountToCents } from "@/lib/utils";
import { getPlanStatus } from "@/lib/subscription";
import type { ActionResult } from "@/lib/actions/transactions";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

const budgetInput = z.object({
  categoryId: z.string().min(1, "Catégorie requise"),
  amount: z.string().min(1, "Montant requis"),
});

/** Crée ou met à jour le budget mensuel d'une catégorie. */
export async function setBudget(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const { premium } = await getPlanStatus(userId);
  if (!premium) {
    return {
      ok: false,
      error: "Les budgets sont réservés au plan Premium.",
    };
  }

  const parsed = budgetInput.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  const amountCents = parseAmountToCents(parsed.data.amount);
  if (amountCents === null || amountCents <= 0) {
    return { ok: false, error: "Montant invalide" };
  }

  // Vérifie que la catégorie appartient bien à l'utilisateur.
  const cat = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId },
    select: { id: true },
  });
  if (!cat) return { ok: false, error: "Catégorie introuvable" };

  await prisma.budget.upsert({
    where: { categoryId: cat.id },
    create: { userId, categoryId: cat.id, amountCents },
    update: { amountCents },
  });

  revalidatePath("/budgets");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteBudget(categoryId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.budget.deleteMany({ where: { categoryId, userId } });
  revalidatePath("/budgets");
  revalidatePath("/");
  return { ok: true };
}
