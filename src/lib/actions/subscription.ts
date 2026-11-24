"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { priceCentsFor, PLANS, type PlanKey, type Cycle } from "@/lib/plans";
import { initFedapay, fedapayConfigured, Transaction } from "@/lib/fedapay";
import type { ActionResult } from "@/lib/actions/transactions";

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.email)) {
    throw new Error("Accès refusé");
  }
}

function computeEndsAt(base: Date, cycle: Cycle): Date {
  const d = new Date(base);
  if (cycle === "ANNUEL") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

/** Applique un paiement approuvé : crée l'abonnement et prolonge le plan (idempotent). */
async function applyApprovedPayment(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === "APPROVED") return;

  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: { plan: true, planUntil: true },
  });
  const now = new Date();
  const base =
    user?.planUntil && user.planUntil > now && user.plan === payment.plan
      ? user.planUntil
      : now;
  const endsAt = computeEndsAt(base, payment.cycle);

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "APPROVED" },
    }),
    prisma.subscription.create({
      data: {
        userId: payment.userId,
        plan: payment.plan,
        cycle: payment.cycle,
        priceCents: payment.amountCents,
        startedAt: now,
        endsAt,
        status: "ACTIVE",
        note: "Payé (FedaPay)",
      },
    }),
    prisma.user.update({
      where: { id: payment.userId },
      data: { plan: payment.plan, planUntil: endsAt },
    }),
  ]);
}

/** Démarre un paiement FedaPay pour le plan choisi. Retourne l'URL de paiement. */
export async function startCheckout(
  plan: PlanKey,
  cycle: Cycle,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Non authentifié" };
  if (plan === "GRATUIT") return { ok: false, error: "Rien à payer." };
  if (!fedapayConfigured()) {
    return { ok: false, error: "Paiement non configuré. Contactez l'administrateur." };
  }

  const amountCents = priceCentsFor(plan, cycle);
  const amountXof = Math.round(amountCents / 100); // FedaPay XOF = francs entiers

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });
  if (!user) return { ok: false, error: "Compte introuvable" };

  const payment = await prisma.payment.create({
    data: { userId: session.user.id, plan, cycle, amountCents, status: "PENDING" },
  });

  try {
    initFedapay();
    const base = process.env.AUTH_URL || "http://localhost:3000";
    const parts = (user.name || "Client").trim().split(/\s+/);
    const firstname = parts[0] || "Client";
    const lastname = parts.slice(1).join(" ") || "-";

    const tx = await Transaction.create({
      description: `MonBudget ${PLANS[plan].label} (${cycle === "ANNUEL" ? "annuel" : "mensuel"})`,
      amount: amountXof,
      currency: { iso: "XOF" },
      callback_url: `${base}/abonnement/retour?pid=${payment.id}`,
      customer: { firstname, lastname, email: user.email },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { fedapayId: String(tx.id) },
    });

    const token = await tx.generateToken();
    return { ok: true, url: token.url };
  } catch {
    await prisma.payment
      .update({ where: { id: payment.id }, data: { status: "CANCELED" } })
      .catch(() => {});
    return { ok: false, error: "Erreur lors de l'initialisation du paiement." };
  }
}

/** Vérifie et active un paiement (appelé par la page de retour, idempotent). */
export async function activatePaymentById(
  paymentId: string,
): Promise<{ ok: boolean; status: string }> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { ok: false, status: "introuvable" };
  if (payment.status === "APPROVED") return { ok: true, status: "approved" };
  if (!payment.fedapayId || !fedapayConfigured()) {
    return { ok: false, status: "pending" };
  }

  try {
    initFedapay();
    const tx = await Transaction.retrieve(Number(payment.fedapayId));
    const st = String(tx.status || "pending");
    if (st === "approved") {
      await applyApprovedPayment(payment.id);
      revalidatePath("/abonnement");
      return { ok: true, status: "approved" };
    }
    if (["canceled", "declined", "expired"].includes(st)) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELED" },
      });
    }
    return { ok: false, status: st };
  } catch {
    return { ok: false, status: "erreur" };
  }
}

/** Active un paiement depuis le webhook (par id de transaction FedaPay). */
export async function approvePaymentByFedapayId(fedapayId: string): Promise<void> {
  const payment = await prisma.payment.findFirst({
    where: { fedapayId },
    orderBy: { createdAt: "desc" },
  });
  if (payment) await applyApprovedPayment(payment.id);
}

/** Admin : active/prolonge un plan pour un utilisateur. */
export async function grantPlan(
  userId: string,
  plan: PlanKey,
  cycle: Cycle,
  note = "Activé par l'admin",
): Promise<ActionResult> {
  await requireAdmin();
  if (plan === "GRATUIT") return cancelSubscription(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planUntil: true },
  });
  if (!user) return { ok: false, error: "Compte introuvable" };

  const now = new Date();
  const base =
    user.planUntil && user.planUntil > now && user.plan === plan
      ? user.planUntil
      : now;
  const endsAt = computeEndsAt(base, cycle);
  const priceCents = priceCentsFor(plan, cycle);

  await prisma.$transaction([
    prisma.subscription.create({
      data: {
        userId,
        plan,
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
      data: { plan, planUntil: endsAt },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/abonnement");
  return { ok: true };
}

/** Admin : repasse un utilisateur en Gratuit (expire immédiatement). */
export async function cancelSubscription(userId: string): Promise<ActionResult> {
  await requireAdmin();
  const now = new Date();
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELED" },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { plan: "GRATUIT", planUntil: now },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/abonnement");
  return { ok: true };
}
