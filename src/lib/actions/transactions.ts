"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseAmountToCents } from "@/lib/utils";
import { getPlanStatus, FREE_LIMITS, monthRange } from "@/lib/subscription";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

export type ActionResult = { ok: boolean; error?: string };

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/operations");
  revalidatePath("/statistiques");
  revalidatePath("/budgets");
  revalidatePath("/comptes");
}

const transactionInput = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  amount: z.string().min(1, "Montant requis"),
  note: z.string().trim().max(200).optional(),
  date: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
});

/** Valide la catégorie et retourne son id si elle appartient à l'utilisateur. */
async function resolveCategoryId(
  userId: string,
  categoryId: string | undefined,
  type: "INCOME" | "EXPENSE",
): Promise<string | null> {
  // Les revenus ne sont pas catégorisés dans cette version.
  if (type === "INCOME" || !categoryId) return null;
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  return cat?.id ?? null;
}

/** Valide le compte et retourne son id s'il appartient à l'utilisateur. */
async function resolveAccountId(
  userId: string,
  accountId: string | undefined,
): Promise<string | null> {
  if (!accountId) return null;
  const acc = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });
  return acc?.id ?? null;
}

export async function createTransaction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  // Limite du plan Gratuit : nombre d'opérations par mois.
  const status = await getPlanStatus(userId);
  if (status.rank < 1) {
    const { start, end } = monthRange();
    const count = await prisma.transaction.count({
      where: { userId, date: { gte: start, lt: end } },
    });
    if (count >= FREE_LIMITS.txPerMonth) {
      return {
        ok: false,
        error: `Plan Gratuit limité à ${FREE_LIMITS.txPerMonth} opérations/mois. Passez à un plan payant pour en ajouter plus.`,
      };
    }
  }

  const parsed = transactionInput.safeParse({
    type: formData.get("type") || undefined,
    amount: formData.get("amount"),
    note: formData.get("note") || undefined,
    date: formData.get("date") || undefined,
    categoryId: formData.get("categoryId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  const amountCents = parseAmountToCents(parsed.data.amount);
  if (amountCents === null || amountCents <= 0) {
    return { ok: false, error: "Montant invalide" };
  }

  const categoryId = await resolveCategoryId(
    userId,
    parsed.data.categoryId,
    parsed.data.type,
  );
  const accountId = await resolveAccountId(userId, parsed.data.accountId);

  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

  await prisma.transaction.create({
    data: {
      userId,
      type: parsed.data.type,
      amountCents,
      note: parsed.data.note ?? "",
      date: isNaN(date.getTime()) ? new Date() : date,
      categoryId,
      accountId,
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await prisma.transaction.deleteMany({ where: { id, userId } });
  revalidateAll();
  return { ok: true };
}

const updateInput = transactionInput.extend({ id: z.string().min(1) });

export async function updateTransaction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const parsed = updateInput.safeParse({
    id: formData.get("id"),
    type: formData.get("type") || undefined,
    amount: formData.get("amount"),
    note: formData.get("note") || undefined,
    date: formData.get("date") || undefined,
    categoryId: formData.get("categoryId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  const amountCents = parseAmountToCents(parsed.data.amount);
  if (amountCents === null || amountCents <= 0) {
    return { ok: false, error: "Montant invalide" };
  }

  const categoryId = await resolveCategoryId(
    userId,
    parsed.data.categoryId,
    parsed.data.type,
  );
  const accountId = await resolveAccountId(userId, parsed.data.accountId);

  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

  await prisma.transaction.updateMany({
    where: { id: parsed.data.id, userId },
    data: {
      type: parsed.data.type,
      amountCents,
      note: parsed.data.note ?? "",
      date: isNaN(date.getTime()) ? new Date() : date,
      categoryId,
      accountId,
    },
  });

  revalidateAll();
  return { ok: true };
}
