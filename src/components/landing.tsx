import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  PieChart,
  Target,
  Smartphone,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Revenus & dépenses",
    text: "Enregistrez chaque entrée et sortie d'argent, et suivez votre solde en temps réel.",
  },
  {
    icon: Wallet,
    title: "Comptes multiples",
    text: "Espèces, Mobile Money (Wave, Orange Money…), banque : chaque portefeuille avec son solde.",
  },
  {
    icon: Target,
    title: "Budgets & alertes",
    text: "Fixez un plafond par catégorie et visualisez quand vous approchez de la limite.",
  },
  {
    icon: PieChart,
    title: "Statistiques claires",
    text: "Répartition des dépenses, tendance sur 6 mois, revenus vs dépenses.",
  },
  {
    icon: Smartphone,
    title: "Installable (PWA)",
    text: "Ajoutez MonBudget à votre écran d'accueil et utilisez-la comme une vraie application.",
  },
  {
    icon: ShieldCheck,
    title: "Privé & sécurisé",
    text: "Vos données restent sur votre instance. Connexion protégée, mots de passe chiffrés.",
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
          MonBudget vous aide à suivre vos revenus et vos dépenses, gérer vos
          comptes (espèces, Mobile Money, banque), fixer des budgets et
          visualiser où part votre argent — le tout en Francs CFA.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="gradient-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold text-white shadow-lg shadow-primary/25 transition active:scale-[0.99] sm:w-auto"
          >
            Commencer gratuitement <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-border px-6 text-base font-medium transition hover:bg-surface-muted sm:w-auto"
          >
            J&apos;ai déjà un compte
          </Link>
        </div>
      </section>

      {/* Aperçu / carte solde factice */}
      <section className="mx-auto max-w-sm px-4 pb-12">
        <div className="gradient-primary rounded-3xl p-6 text-white shadow-xl shadow-primary/20">
          <p className="text-sm text-white/80">Solde disponible</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">85 500 F CFA</p>
          <div className="mt-5 flex gap-3 text-sm">
            <span className="flex-1 rounded-xl bg-white/15 px-3 py-2">
              <span className="block text-white/70">Revenus</span>
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
          Tout ce qu'il faut pour gérer votre budget
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

      {/* CTA final */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center">
          <h2 className="text-2xl font-bold">Prêt à reprendre le contrôle ?</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Créez votre compte en moins d&apos;une minute. C&apos;est gratuit.
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
        MonBudget — Suivez vos revenus et dépenses en quelques clics.
      </footer>
    </main>
  );
}
