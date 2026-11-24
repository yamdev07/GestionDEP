import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  PieChart,
  Target,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  Check,
  Crown,
} from "lucide-react";
import { PLANS, FREE_LIMITS } from "@/lib/plans";
import { formatMoney } from "@/lib/utils";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Entrées & dépenses",
    text: "Enregistrez chaque entrée et sortie d'argent, et suivez votre solde en temps réel.",
  },
  {
    icon: Wallet,
    title: "Comptes multiples",
    text: "Espèces, Mobile Money (Wave, Orange Money…), banque : chaque portefeuille avec son solde.",
  },
  {
    icon: Target,
    title: "Budgets & épargne",
    text: "Fixez des plafonds par catégorie et mettez de l'argent de côté avec des objectifs.",
  },
  {
    icon: PieChart,
    title: "Statistiques claires",
    text: "Répartition des dépenses, tendance sur 6 mois, entrées vs dépenses.",
  },
  {
    icon: Smartphone,
    title: "Installable (PWA)",
    text: "Ajoutez MonBudget à votre écran d'accueil et utilisez-la comme une vraie application.",
  },
  {
    icon: ShieldCheck,
    title: "Privé & sécurisé",
    text: "Vos données restent protégées. Connexion sécurisée, mots de passe chiffrés.",
  },
];

const PRICING: {
  key: "GRATUIT" | "ESSENTIEL" | "PREMIUM";
  features: string[];
  highlight?: boolean;
}[] = [
  {
    key: "GRATUIT",
    features: [
      `${FREE_LIMITS.accounts} portefeuille`,
      `${FREE_LIMITS.txPerMonth} opérations / mois`,
      `${FREE_LIMITS.goals} objectif d'épargne`,
    ],
  },
  {
    key: "ESSENTIEL",
    highlight: true,
    features: [
      "Portefeuilles illimités",
      "Opérations illimitées",
      "Budgets par catégorie",
      "Statistiques avancées",
    ],
  },
  {
    key: "PREMIUM",
    features: [
      "Tout l'Essentiel",
      "Export des données",
      "Partage familial (à venir)",
      "Support prioritaire",
    ],
  },
];

export function Landing() {
  return (
    <main className="min-h-dvh">
      {/* En-tête */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="gradient-primary flex h-9 w-9 items-center justify-center rounded-xl text-white">
            <Wallet className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold">MonBudget</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="gradient-primary rounded-xl px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            Créer un compte
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-8 text-center sm:pt-16">
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Gestion de budget personnel
        </span>
        <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Gardez le contrôle de votre argent,{" "}
          <span className="bg-gradient-to-r from-primary-from to-primary-to bg-clip-text text-transparent">
            sans effort
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">
          MonBudget vous aide à suivre vos entrées et dépenses, gérer vos
          comptes (espèces, Mobile Money, banque), épargner et visualiser où
          part votre argent — le tout en Francs CFA.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="#tarifs"
            className="gradient-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold text-white shadow-lg shadow-primary/25 transition active:scale-[0.99] sm:w-auto"
          >
            Commencer <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-border px-6 text-base font-medium transition hover:bg-surface-muted sm:w-auto"
          >
            J&apos;ai déjà un compte
          </Link>
        </div>
      </section>

      {/* Aperçu carte solde */}
      <section className="mx-auto max-w-sm px-4 pb-12">
        <div className="gradient-primary rounded-3xl p-6 text-white shadow-xl shadow-primary/20">
          <p className="text-sm text-white/80">Solde disponible</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">85 500 F CFA</p>
          <div className="mt-5 flex gap-3 text-sm">
            <span className="flex-1 rounded-xl bg-white/15 px-3 py-2">
              <span className="block text-white/70">Entrées</span>
              <span className="font-semibold">+135 000</span>
            </span>
            <span className="flex-1 rounded-xl bg-white/15 px-3 py-2">
              <span className="block text-white/70">Dépenses</span>
              <span className="font-semibold">-49 500</span>
            </span>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-6 text-center text-2xl font-bold">
          Tout ce qu&apos;il faut pour gérer votre budget
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="mx-auto max-w-5xl px-4 pb-16 scroll-mt-6">
        <h2 className="mb-2 text-center text-2xl font-bold">Des tarifs simples</h2>
        <p className="mb-8 text-center text-muted">
          Commence gratuitement, passe à un plan payant quand tu veux.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PRICING.map(({ key, features, highlight }) => {
            const plan = PLANS[key];
            return (
              <div
                key={key}
                className={
                  "relative flex flex-col rounded-3xl bg-surface p-6 " +
                  (highlight
                    ? "border-2 border-primary shadow-lg shadow-primary/10"
                    : "border border-border")
                }
              >
                {highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                    Recommandé
                  </span>
                )}
                <h3 className="flex items-center gap-1.5 font-bold">
                  {key !== "GRATUIT" && <Crown className="h-4 w-4 text-primary" />}
                  {plan.label}
                </h3>
                <p className="mt-1 text-3xl font-extrabold">
                  {formatMoney(plan.monthlyCents, "XOF")}
                  {key !== "GRATUIT" && (
                    <span className="text-base font-medium text-muted"> / mois</span>
                  )}
                </p>
                {key !== "GRATUIT" && (
                  <p className="text-xs text-muted">
                    ou {formatMoney(plan.annualCents, "XOF")} / an
                  </p>
                )}
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {features.map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-success" /> {t}
                    </li>
                  ))}
                </ul>
                <Link
                  href={key === "GRATUIT" ? "/register" : `/register?plan=${key}`}
                  className={
                    "mt-5 flex h-11 items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.99] " +
                    (highlight || key === "PREMIUM"
                      ? "gradient-primary text-white"
                      : "border border-border hover:bg-surface-muted")
                  }
                >
                  {key === "GRATUIT" ? "Commencer gratuitement" : `Choisir ${plan.label}`}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-center text-xs text-muted">
          Paiement sécurisé par FedaPay (Mobile Money &amp; carte) · activation
          après inscription.
        </p>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center">
          <h2 className="text-2xl font-bold">Prêt à reprendre le contrôle ?</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Créez votre compte en moins d&apos;une minute.
          </p>
          <Link
            href="/register"
            className="gradient-primary mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 font-semibold text-white shadow-lg shadow-primary/25 transition active:scale-[0.99]"
          >
            Créer mon compte <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        MonBudget — Suivez vos entrées et dépenses en quelques clics.
      </footer>
    </main>
  );
}
