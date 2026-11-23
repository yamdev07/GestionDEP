"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";

const registerSchema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().email("Email invalide").transform((e) => e.toLowerCase()),
  password: z.string().min(6, "6 caractères minimum"),
});

export type RegisterState = { error?: string } | undefined;

// Catégories créées automatiquement pour chaque nouveau compte.
const DEFAULT_CATEGORIES = [
  { name: "Alimentation", color: "#22c55e", icon: "utensils" },
  { name: "Transport", color: "#3b82f6", icon: "car" },
  { name: "Logement", color: "#f59e0b", icon: "home" },
  { name: "Loisirs", color: "#a855f7", icon: "gamepad-2" },
  { name: "Santé", color: "#ef4444", icon: "heart-pulse" },
  { name: "Shopping", color: "#ec4899", icon: "shopping-bag" },
  { name: "Factures", color: "#06b6d4", icon: "receipt" },
  { name: "Autre", color: "#6b7280", icon: "tag" },
];

export async function registerUser(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      categories: { create: DEFAULT_CATEGORIES },
    },
  });

  return undefined; // succès
}

export type LoginState = { error?: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect." };
    }
    // signIn lève une redirection en cas de succès : on la laisse remonter.
    throw error;
  }
  return undefined;
}
