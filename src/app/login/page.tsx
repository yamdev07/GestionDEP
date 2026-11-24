import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { next } = await searchParams;
  // On n'accepte qu'un chemin interne (évite les redirections ouvertes).
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-4">
      <Link
        href="/"
        aria-label="Retour à l'accueil"
        className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:bg-surface-muted hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 flex flex-col items-center gap-3 text-center transition hover:opacity-90"
        >
          <span className="gradient-primary flex h-12 w-12 items-center justify-center rounded-2xl text-white">
            <Wallet className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-2xl font-bold">MonBudget</span>
            <span className="block text-sm text-muted">Content de te revoir 👋</span>
          </span>
        </Link>
        <Card>
          <LoginForm next={safeNext} />
        </Card>
      </div>
    </main>
  );
}
