"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Champ mot de passe avec un bouton « œil » pour afficher/masquer la saisie.
 * Reprend toutes les props d'un <input> (name, required, placeholder…).
 */
export function PasswordInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={show ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        title={show ? "Masquer" : "Afficher"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
