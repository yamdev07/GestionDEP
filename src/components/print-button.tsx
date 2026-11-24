"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

/** Lance l'impression de la page (utile pour garder un relevé papier/PDF). */
export function PrintButton({ label = "Imprimer" }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      className="gap-2"
    >
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
