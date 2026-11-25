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

export type ActionResult = { ok: boolean; error?: string; upgrade?: boolean };

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
        upgrade: true,
        error: `Tu as atteint la limite du plan Gratuit (${FREE_LIMITS.txPerMonth} opérations/mois).`,
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

export type AddExpenseResult =
  | {
      ok: true;
      expense: { id: string; amountCents: number; date: string; note: string };
    }
  | { ok: false; error: string; upgrade?: boolean };

const pastExpenseInput = z.object({
  amount: z.string().min(1, "Montant requis"),
  date: z.string().min(1, "Date requise"),
  note: z.string().trim().max(200).optional(),
  categoryId: z.string().min(1, "Catégorie requise"),
  accountId: z.string().optional(),
});

/**
 * Ajoute une dépense (souvent antidatée) rattachée à une catégorie donnée.
 * Pensé pour la saisie groupée depuis une catégorie : appelable directement
 * depuis un composant client, renvoie la dépense créée pour l'affichage.
 * La limite du plan Gratuit s'applique au mois de la date saisie.
 */
export async function addPastExpense(input: {
  amount: string;
  date: string;
  note?: string;
  categoryId: string;
  accountId?: string;
}): Promise<AddExpenseResult> {
  const userId = await requireUserId();

  const parsed = pastExpenseInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  // La catégorie doit appartenir à l'utilisateur.
  const cat = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId },
    select: { id: true },
  });
  if (!cat) return { ok: false, error: "Catégorie introuvable." };

  const amountCents = parseAmountToCents(parsed.data.amount);
  if (amountCents === null || amountCents <= 0) {
    return { ok: false, error: "Montant invalide" };
  }

  const date = new Date(parsed.data.date);
  if (isNaN(date.getTime())) {
    return { ok: false, error: "Date invalide" };
  }

  // Limite du plan Gratuit : nombre d'opérations pour le MOIS de la date saisie.
  const status = await getPlanStatus(userId);
  if (status.rank < 1) {
    const { start, end } = monthRange(date);
    const count = await prisma.transaction.count({
      where: { userId, date: { gte: start, lt: end } },
    });
    if (count >= FREE_LIMITS.txPerMonth) {
      return {
        ok: false,
        upgrade: true,
        error: `Limite du plan Gratuit atteinte pour ce mois (${FREE_LIMITS.txPerMonth} opérations).`,
      };
    }
  }

  const accountId = await resolveAccountId(userId, parsed.data.accountId);

  const tx = await prisma.transaction.create({
    data: {
      userId,
      type: "EXPENSE",
      amountCents,
      note: parsed.data.note ?? "",
      date,
      categoryId: cat.id,
      accountId,
    },
    select: { id: true, amountCents: true, date: true, note: true },
  });

  revalidateAll();
  revalidatePath("/categories");
  return {
    ok: true,
    expense: {
      id: tx.id,
      amountCents: tx.amountCents,
      date: tx.date.toISOString(),
      note: tx.note,
    },
  };
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
