"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseAmountToCents } from "@/lib/utils";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

export type ActionResult = { ok: boolean; error?: string };

const expenseInput = z.object({
  amount: z.string().min(1, "Montant requis"),
  note: z.string().trim().max(200).optional(),
  date: z.string().optional(),
  categoryId: z.string().optional(),
});

export async function createExpense(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const parsed = expenseInput.safeParse({
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

  // Vérifie que la catégorie appartient bien à l'utilisateur.
  let categoryId: string | null = null;
  if (parsed.data.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, userId },
      select: { id: true },
    });
    categoryId = cat?.id ?? null;
  }

  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

  await prisma.expense.create({
    data: {
      userId,
      amountCents,
      note: parsed.data.note ?? "",
      date: isNaN(date.getTime()) ? new Date() : date,
      categoryId,
    },
  });

  revalidatePath("/");
  revalidatePath("/depenses");
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  // deleteMany avec userId => impossible de supprimer la dépense d'un autre.
  await prisma.expense.deleteMany({ where: { id, userId } });
  revalidatePath("/");
  revalidatePath("/depenses");
  return { ok: true };
}

const updateInput = expenseInput.extend({ id: z.string().min(1) });

export async function updateExpense(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const parsed = updateInput.safeParse({
    id: formData.get("id"),
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

  let categoryId: string | null = null;
  if (parsed.data.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, userId },
      select: { id: true },
    });
    categoryId = cat?.id ?? null;
  }

  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

  await prisma.expense.updateMany({
    where: { id: parsed.data.id, userId },
    data: {
      amountCents,
      note: parsed.data.note ?? "",
      date: isNaN(date.getTime()) ? new Date() : date,
      categoryId,
    },
  });

  revalidatePath("/");
  revalidatePath("/depenses");
  return { ok: true };
}
