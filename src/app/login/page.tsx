import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="gradient-primary flex h-12 w-12 items-center justify-center rounded-2xl text-white">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">MonBudget</h1>
            <p className="text-sm text-muted">Content de te revoir 👋</p>
          </div>
        </div>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
