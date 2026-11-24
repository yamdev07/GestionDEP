"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { PRICE_MONTHLY_CENTS, PRICE_ANNUAL_CENTS } from "@/lib/plans";
import type { ActionResult } from "@/lib/actions/transactions";

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.email)) {
    throw new Error("Accès refusé");
  }
}

/** Active ou prolonge Premium pour un utilisateur (réservé à l'admin). */
export async function grantPremium(
  userId: string,
  cycle: "MENSUEL" | "ANNUEL",
  note = "Activé par l'admin",
): Promise<ActionResult> {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { premiumUntil: true },
  });
  if (!user) return { ok: false, error: "Compte introuvable" };

  const now = new Date();
  // Prolonge à partir de l'expiration si encore active, sinon à partir d'aujourd'hui.
  const base =
    user.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;
  const endsAt = new Date(base);
  if (cycle === "ANNUEL") endsAt.setFullYear(endsAt.getFullYear() + 1);
  else endsAt.setMonth(endsAt.getMonth() + 1);

  const priceCents =
    cycle === "ANNUEL" ? PRICE_ANNUAL_CENTS : PRICE_MONTHLY_CENTS;

  await prisma.$transaction([
    prisma.subscription.create({
      data: {
        userId,
        plan: "PREMIUM",
        cycle,
        priceCents,
        startedAt: now,
        endsAt,
        status: "ACTIVE",
        note,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { premiumUntil: endsAt },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/abonnement");
  return { ok: true };
}

/** Annule le Premium d'un utilisateur : expire immédiatement. */
export async function cancelPremium(userId: string): Promise<ActionResult> {
  await requireAdmin();
  const now = new Date();
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELED" },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { premiumUntil: now },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/abonnement");
  return { ok: true };
}
