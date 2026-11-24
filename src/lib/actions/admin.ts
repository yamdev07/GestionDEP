"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import type { ActionResult } from "@/lib/actions/transactions";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.email)) {
    throw new Error("Accès refusé");
  }
  return { id: session.user.id, email: session.user.email ?? "" };
}

/** Supprime définitivement un compte et toutes ses données (cascade). */
export async function deleteUser(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    return { ok: false, error: "Impossible de supprimer le compte admin." };
  }
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    return { ok: false, error: "Compte introuvable ou déjà supprimé." };
  }
  revalidatePath("/admin");
  return { ok: true };
}

const resetSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(6, "6 caractères minimum"),
});

/** Réinitialise le mot de passe d'un compte. */
export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = resetSchema.safeParse({ userId, password });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { passwordHash },
    });
  } catch {
    return { ok: false, error: "Compte introuvable." };
  }

  revalidatePath("/admin");
  return { ok: true };
}
