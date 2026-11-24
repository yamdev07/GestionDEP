"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { rateLimit, purgeExpired } from "@/lib/rate-limit";
import { TRIAL_DAYS, TRIAL_PLAN } from "@/lib/plans";

const registerSchema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().email("Email invalide").transform((e) => e.toLowerCase()),
  password: z.string().min(6, "6 caractères minimum"),
});

/** Valide une destination de redirection interne (évite les redirections ouvertes). */
function safeInternalPath(raw: string): string {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

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

  // Essai gratuit : le nouveau compte reçoit le plan d'essai pendant TRIAL_DAYS jours,
  // puis bascule automatiquement en Gratuit (effectivePlan gère l'expiration).
  const now = new Date();
  const trialUntil = new Date(now.getTime() + TRIAL_DAYS * 86400000);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      plan: TRIAL_PLAN,
      planUntil: trialUntil,
      categories: { create: DEFAULT_CATEGORIES },
      accounts: { create: [{ name: "Espèces", type: "CASH", color: "#6d28d9" }] },
      subscriptions: {
        create: [
          {
            plan: TRIAL_PLAN,
            cycle: "MENSUEL",
            priceCents: 0,
            startedAt: now,
            endsAt: trialUntil,
            status: "ACTIVE",
            note: `Essai gratuit ${TRIAL_DAYS} jours`,
          },
        ],
      },
    },
  });

  // Connexion automatique puis redirection (le nouveau ne se reconnecte pas).
  const redirectTo = safeInternalPath(String(formData.get("next") ?? ""));
  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      // Compte bien créé, mais la connexion auto a échoué : on renvoie vers /login.
      return { error: "Compte créé. Connecte-toi pour continuer." };
    }
    throw error; // redirection (NEXT_REDIRECT) : on laisse remonter.
  }

  return undefined; // succès (normalement inatteignable : signIn redirige)
}

export type LoginState = { error?: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // Anti-force-brute : 5 tentatives / 5 min par IP + email.
  purgeExpired();
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "local";
  const email = String(formData.get("email") ?? "").toLowerCase();
  const { allowed, retryAfter } = rateLimit(`login:${ip}:${email}`);
  if (!allowed) {
    const minutes = Math.ceil(retryAfter / 60);
    return {
      error: `Trop de tentatives. Réessayez dans ${minutes} min.`,
    };
  }

  // Destination après connexion : on n'accepte qu'un chemin interne.
  const rawNext = String(formData.get("next") ?? "");
  const redirectTo =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo,
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
