"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

const subInput = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

export type PushActionResult = { ok: boolean; error?: string };

/** Enregistre (ou met à jour) l'abonnement push de l'appareil courant. */
export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<PushActionResult> {
  const userId = await requireUserId();

  const parsed = subInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Abonnement invalide" };
  }

  // endpoint est unique : on réassigne au besoin à cet utilisateur.
  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      userId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
    update: {
      userId,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
  });

  return { ok: true };
}

/** Retire l'abonnement push de l'appareil courant. */
export async function deletePushSubscription(
  endpoint: string,
): Promise<PushActionResult> {
  const userId = await requireUserId();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  return { ok: true };
}
