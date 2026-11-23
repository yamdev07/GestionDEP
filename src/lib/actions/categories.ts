"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/actions/expenses";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

const categoryInput = z.object({
  name: z.string().trim().min(1, "Nom requis").max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide")
    .default("#6366f1"),
  icon: z.string().trim().max(40).default("tag"),
});

export async function createCategory(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const parsed = categoryInput.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
    icon: formData.get("icon") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }

  const exists = await prisma.category.findFirst({
    where: { userId, name: parsed.data.name },
    select: { id: true },
  });
  if (exists) {
    return { ok: false, error: "Cette catégorie existe déjà." };
  }

  await prisma.category.create({
    data: {
      userId,
      name: parsed.data.name,
      color: parsed.data.color,
      icon: parsed.data.icon,
    },
  });

  revalidatePath("/categories");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  // Les dépenses liées passent à "sans catégorie" (onDelete: SetNull).
  await prisma.category.deleteMany({ where: { id, userId } });
  revalidatePath("/categories");
  revalidatePath("/");
  return { ok: true };
}
