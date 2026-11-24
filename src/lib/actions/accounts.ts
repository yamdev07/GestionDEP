"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseAmountToCents } from "@/lib/utils";
import { getPlanStatus, FREE_LIMITS } from "@/lib/subscription";
import type { ActionResult } from "@/lib/actions/transactions";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

function revalidateAccounts() {
  revalidatePath("/");
  revalidatePath("/comptes");
  revalidatePath("/ajouter");
  revalidatePath("/operations");
}

const accountInput = z.object({
  name: z.string().trim().min(1, "Nom requis").max(40),
  type: z.enum(["CASH", "MOBILE_MONEY", "BANK", "OTHER"]).default("CASH"),
  color: z.string().trim().max(9).optional(),
  initialBalance: z.string().optional(),
});

export async function createAccount(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const parsed = accountInput.safeParse({
    name: formData.get("name"),
    type: formData.get("type") || undefined,
    color: formData.get("color") || undefined,
    initialBalance: formData.get("initialBalance") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  const { premium } = await getPlanStatus(userId);
  if (!premium) {
    const count = await prisma.account.count({ where: { userId } });
    if (count >= FREE_LIMITS.accounts) {
      return {
        ok: false,
        error: `Plan Gratuit limité à ${FREE_LIMITS.accounts} portefeuille. Passez Premium pour en ajouter.`,
      };
    }
  }

  const initialBalanceCents = parsed.data.initialBalance
    ? (parseAmountToCents(parsed.data.initialBalance) ?? 0)
    : 0;

  try {
    await prisma.account.create({
      data: {
        userId,
        name: parsed.data.name,
        type: parsed.data.type,
        color: parsed.data.color ?? "#6d28d9",
        initialBalanceCents,
      },
    });
  } catch {
    return { ok: false, error: "Un compte porte déjà ce nom." };
  }

  revalidateAccounts();
  return { ok: true };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  // Les opérations liées ne sont PAS supprimées : elles passent en « non assigné ».
  await prisma.account.deleteMany({ where: { id, userId } });
  revalidateAccounts();
  return { ok: true };
}

/**
 * Garantit qu'un utilisateur a au moins un compte.
 * À l'activation de la fonctionnalité, crée « Espèces » et y rattache les
 * opérations existantes encore sans compte. Idempotent et peu coûteux.
 */
export async function ensureDefaultAccount(userId: string): Promise<void> {
  const count = await prisma.account.count({ where: { userId } });
  if (count > 0) return;

  const account = await prisma.account.create({
    data: { userId, name: "Espèces", type: "CASH", color: "#6d28d9" },
  });

  await prisma.transaction.updateMany({
    where: { userId, accountId: null },
    data: { accountId: account.id },
  });
}
