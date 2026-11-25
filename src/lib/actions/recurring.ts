"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseAmountToCents } from "@/lib/utils";
import { getPlanStatus } from "@/lib/subscription";
import { canRecurring } from "@/lib/plans";
import type { ActionResult } from "@/lib/actions/transactions";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

type Frequency = "WEEKLY" | "MONTHLY" | "YEARLY";

/** Avance une date d'une période selon la fréquence. */
function advanceDate(date: Date, frequency: Frequency): Date {
  const d = new Date(date);
  if (frequency === "WEEKLY") d.setDate(d.getDate() + 7);
  else if (frequency === "YEARLY") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

/**
 * Génère les opérations réelles dues pour les récurrences de l'utilisateur
 * (celles dont nextRunAt <= maintenant). Idempotent : avance nextRunAt à chaque
 * occurrence créée. Réservé Premium — sans effet pour les autres plans.
 */
export async function materializeRecurring(userId: string): Promise<void> {
  const status = await getPlanStatus(userId);
  if (!canRecurring(status.plan)) return;

  const now = new Date();
  const due = await prisma.recurringTransaction.findMany({
    where: { userId, active: true, nextRunAt: { lte: now } },
  });
  if (due.length === 0) return;

  for (const r of due) {
    const toCreate: {
      userId: string;
      type: "INCOME" | "EXPENSE";
      amountCents: number;
      note: string;
      date: Date;
      categoryId: string | null;
      accountId: string | null;
    }[] = [];
    let next = new Date(r.nextRunAt);
    let guard = 0;
    // Rattrape les occurrences passées (borne de sécurité à 120 pour éviter une boucle longue).
    while (next.getTime() <= now.getTime() && guard < 120) {
      toCreate.push({
        userId,
        type: r.type,
        amountCents: r.amountCents,
        note: r.note,
        date: new Date(next),
        categoryId: r.categoryId,
        accountId: r.accountId,
      });
      next = advanceDate(next, r.frequency as Frequency);
      guard++;
    }
    if (toCreate.length > 0) {
      await prisma.$transaction([
        prisma.transaction.createMany({ data: toCreate }),
        prisma.recurringTransaction.update({
          where: { id: r.id },
          data: { nextRunAt: next },
        }),
      ]);
    }
  }
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/recurrences");
  revalidatePath("/operations");
  revalidatePath("/statistiques");
}

const recurringInput = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  amount: z.string().min(1, "Montant requis"),
  note: z.string().trim().max(200).optional(),
  frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  startDate: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
});

async function resolveCategoryId(
  userId: string,
  categoryId: string | undefined,
  type: "INCOME" | "EXPENSE",
): Promise<string | null> {
  if (type === "INCOME" || !categoryId) return null;
  const cat = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  return cat?.id ?? null;
}

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

function parseDateInput(s: string | undefined): Date {
  if (s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

/** Crée une opération récurrente (Premium) et génère les occurrences déjà dues. */
export async function createRecurring(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const status = await getPlanStatus(userId);
  if (!canRecurring(status.plan)) {
    return {
      ok: false,
      upgrade: true,
      error: "Les opérations récurrentes sont réservées au plan Premium.",
    };
  }

  const parsed = recurringInput.safeParse({
    type: formData.get("type") || undefined,
    amount: formData.get("amount"),
    note: formData.get("note") || undefined,
    frequency: formData.get("frequency") || undefined,
    startDate: formData.get("startDate") || undefined,
    categoryId: formData.get("categoryId") || undefined,
    accountId: formData.get("accountId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  const amountCents = parseAmountToCents(parsed.data.amount);
  if (amountCents === null || amountCents <= 0) {
    return { ok: false, error: "Montant invalide" };
  }

  const categoryId = await resolveCategoryId(userId, parsed.data.categoryId, parsed.data.type);
  const accountId = await resolveAccountId(userId, parsed.data.accountId);
  const startDate = parseDateInput(parsed.data.startDate);

  await prisma.recurringTransaction.create({
    data: {
      userId,
      type: parsed.data.type,
      amountCents,
      note: parsed.data.note ?? "",
      frequency: parsed.data.frequency,
      startDate,
      nextRunAt: startDate,
      categoryId,
      accountId,
    },
  });

  // Génère tout de suite les occurrences déjà dues (startDate dans le passé/aujourd'hui).
  await materializeRecurring(userId);
  revalidateAll();
  return { ok: true };
}

/** Active/désactive une récurrence. */
export async function toggleRecurring(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const r = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    select: { id: true, active: true },
  });
  if (!r) return { ok: false, error: "Introuvable" };
  await prisma.recurringTransaction.update({
    where: { id: r.id },
    data: { active: !r.active },
  });
  revalidateAll();
  return { ok: true };
}

/** Supprime une récurrence (les opérations déjà générées sont conservées). */
export async function deleteRecurring(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const r = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!r) return { ok: false, error: "Introuvable" };
  await prisma.recurringTransaction.delete({ where: { id: r.id } });
  revalidateAll();
  return { ok: true };
}
