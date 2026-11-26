import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  PieChart,
  Target,
  PiggyBank,
  Landmark,
  Pencil,
  ArrowRight,
  Check,
  Crown,
} from "lucide-react";
import { PLANS } from "@/lib/plans";
import { formatMoney } from "@/lib/utils";

// Ce que l'utilisateur gagne, en langage simple (pas de jargon).
const FEATURES = [
  {
    icon: TrendingUp,
    title: "Suivez votre argent",
    text: "Consultez vos revenus, vos dépenses et votre argent disponible au même endroit.",
  },
  {
    icon: Pencil,
    title: "Enregistrez vos dépenses",
    text: "Notez chaque achat pour ne plus oublier où votre argent est passé.",
  },
  {
    icon: Target,
    title: "Fixez vos limites",
    text: "Définissez combien vous souhaitez dépenser pour le transport, le logement, les loisirs et autres besoins.",
  },
  {
    icon: PiggyBank,
    title: "Suivez vos économies",
    text: "Mettez de l'argent de côté pour réaliser vos projets.",
  },
  {
    icon: PieChart,
    title: "Comprenez vos dépenses",
    text: "Découvrez les catégories dans lesquelles vous dépensez le plus.",
  },
  {
    icon: Landmark,
    title: "Gérez plusieurs comptes",
    text: "Retrouvez votre argent liquide et celui de vos différents comptes au même endroit.",
  },
];

const STEPS = [
  {
    title: "Créez votre compte",
    text: "Inscrivez-vous pour commencer à organiser votre argent.",
  },
  {
    title: "Ajoutez vos revenus et dépenses",
    text: "Enregistrez l'argent que vous recevez et celui que vous dépensez.",
  },
  {
    title: "Gardez le contrôle",
    text: "Consultez votre solde, surveillez vos dépenses et préparez vos économies.",
  },
];

const WHY = [
  {
    title: "Ne perdez plus le fil de vos dépenses",
    text: "Retrouvez facilement vos achats et paiements.",
  },
  {
    title: "Évitez les mauvaises surprises",
    text: "Surveillez vos limites de dépenses.",
  },
  {
    title: "Sachez où va votre argent",
    text: "Consultez un résumé clair de vos finances.",
  },
  {
    title: "Préparez vos projets",
    text: "Suivez l'argent que vous souhaitez économiser.",
  },
];

const FAQ = [
  {
    q: "À quoi sert MonBudget ?",
    a: "À suivre vos revenus, vos dépenses et vos économies.",
  },
  {
    q: "Est-ce difficile à utiliser ?",
    a: "Non, l'application est conçue pour faciliter la gestion de votre argent.",
  },
  {
    q: "Puis-je suivre mes dépenses chaque mois ?",
    a: "Oui, vous pouvez consulter vos dépenses sur différentes périodes.",
  },
  {
    q: "Puis-je gérer plusieurs comptes ?",
    a: "Oui, vous pouvez regrouper vos différents comptes dans l'application.",
  },
  {
    q: "Puis-je utiliser MonBudget sur téléphone ?",
    a: "Oui, MonBudget s'installe sur votre téléphone et s'utilise comme une application.",
  },
];

const PRICING: {
  key: "ESSENTIEL" | "PREMIUM";
  features: string[];
  highlight?: boolean;
}[] = [
  {
    key: "ESSENTIEL",
    features: [
      "Comptes illimités",
      "Dépenses et revenus illimités",
      "Limites de dépenses par catégorie",
      "Historique de vos dépenses",
      "Résumés détaillés",
    ],
  },
  {
    key: "PREMIUM",
    highlight: true,
    features: [
      "Tout l'Essentiel",
      "Dépenses automatiques (loyer, salaire, abonnements…)",
      "Alertes quand vous approchez d'une limite",
      "Estimation de ce qu'il vous restera en fin de mois",
      "Export de vos données",
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
          Gérez votre argent simplement
        </span>
        <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Votre argent mérite une{" "}
          <span className="bg-gradient-to-r from-primary-from to-primary-to bg-clip-text text-transparent">
            meilleure organisation
          </span>
          .
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">
          Suivez vos revenus, contrôlez vos dépenses et sachez toujours combien
          il vous reste.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="gradient-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold text-white shadow-lg shadow-primary/25 transition active:scale-[0.99] sm:w-auto"
          >
            Commencer gratuitement <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="#fonctionnalites"
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-border px-6 text-base font-medium transition hover:bg-surface-muted sm:w-auto"
          >
            Découvrir l&apos;application
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">
          Simple à utiliser, même sans connaissances en gestion financière.
        </p>
      </section>

      {/* Aperçu carte solde */}
      <section className="mx-auto max-w-sm px-4 pb-12">
        <div className="gradient-primary rounded-3xl p-6 text-white shadow-xl shadow-primary/20">
          <p className="text-sm text-white/80">Ce qu&apos;il vous reste</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">85 500 F CFA</p>
          <div className="mt-5 flex gap-3 text-sm">
            <span className="flex-1 rounded-xl bg-white/15 px-3 py-2">
              <span className="block text-white/70">Reçu</span>
              <span className="font-semibold">+135 000</span>
            </span>
            <span className="flex-1 rounded-xl bg-white/15 px-3 py-2">
              <span className="block text-white/70">Dépensé</span>
              <span className="font-semibold">-49 500</span>
            </span>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section
        id="fonctionnalites"
        className="mx-auto max-w-5xl scroll-mt-6 px-4 pb-16"
      >
        <h2 className="mb-6 text-center text-2xl font-bold">
          Tout ce qu&apos;il faut pour gérer votre argent
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

      {/* Comment ça marche ? */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Comment ça marche ?
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm"
            >
              <span className="gradient-primary mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pourquoi utiliser MonBudget ? */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Pourquoi utiliser MonBudget ?
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {WHY.map((w) => (
            <div
              key={w.title}
              className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-semibold">{w.title}</h3>
                <p className="mt-0.5 text-sm text-muted">{w.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="mx-auto max-w-5xl scroll-mt-6 px-4 pb-16">
        <h2 className="mb-2 text-center text-2xl font-bold">Des tarifs simples</h2>
        <p className="mb-8 text-center text-muted">
          Deux formules, sans engagement. Changez ou arrêtez quand vous voulez.
        </p>
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <Crown className="h-4 w-4 text-primary" />
                  {plan.label}
                </h3>
                <p className="mt-1 text-3xl font-extrabold">
                  {formatMoney(plan.monthlyCents, "XOF")}
                  <span className="text-base font-medium text-muted"> / mois</span>
                </p>
                <p className="text-xs text-muted">
                  ou {formatMoney(plan.annualCents, "XOF")} / an
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {features.map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-success" /> {t}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/register?plan=${key}`}
                  className={
                    "mt-5 flex h-11 items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.99] " +
                    (highlight
                      ? "gradient-primary text-white"
                      : "border border-border hover:bg-surface-muted")
                  }
                >
                  Choisir {plan.label}
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

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Questions fréquentes
        </h2>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                {item.q}
                <span className="ml-3 text-muted transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center">
          <h2 className="mx-auto max-w-xl text-2xl font-bold">
            Et si vous commenciez à mieux gérer votre argent aujourd&apos;hui ?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Prenez de bonnes habitudes financières et gardez une meilleure
            visibilité sur vos dépenses.
          </p>
          <Link
            href="/register"
            className="gradient-primary mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 font-semibold text-white shadow-lg shadow-primary/25 transition active:scale-[0.99]"
          >
            Commencer gratuitement <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-xs text-muted">
            Quelques étapes suffisent pour commencer.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        MonBudget — Sachez combien vous gagnez, combien vous dépensez et combien
        il vous reste.
      </footer>
    </main>
  );
}
