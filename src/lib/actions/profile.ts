"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/transactions";
import { CURRENCY_CODES } from "@/lib/currencies";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

const profileInput = z.object({
  name: z.string().trim().max(80).optional(),
  currency: z.enum(CURRENCY_CODES),
});

export async function updateProfile(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const parsed = profileInput.safeParse({
    name: formData.get("name") || undefined,
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name ?? null,
      currency: parsed.data.currency,
    },
  });

  revalidatePath("/profil");
  revalidatePath("/");
  return { ok: true };
}

const passwordInput = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(6, "6 caractères minimum"),
    confirmPassword: z.string().min(1, "Confirmation requise"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export async function changePassword(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const parsed = passwordInput.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "Compte introuvable" };

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!valid) {
    return { ok: false, error: "Mot de passe actuel incorrect" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { ok: true };
}

const deleteInput = z.object({
  password: z.string().min(1, "Mot de passe requis"),
});

/**
 * Supprime DÉFINITIVEMENT le compte de l'utilisateur connecté et toutes ses
 * données (cascade), après confirmation par mot de passe, puis le déconnecte.
 */
export async function deleteMyAccount(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const parsed = deleteInput.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "Compte introuvable" };

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Mot de passe incorrect" };
  }

  // Les relations (opérations, comptes, budgets, épargne, abonnements…) sont
  // supprimées en cascade (onDelete: Cascade dans le schéma).
  await prisma.user.delete({ where: { id: userId } });

  // Déconnexion + retour à l'accueil (lève une redirection : on la laisse remonter).
  await signOut({ redirectTo: "/" });
  return { ok: true }; // normalement inatteignable
}
