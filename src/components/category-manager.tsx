"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createCategory,
  deleteCategory,
} from "@/lib/actions/categories";
import type { ActionResult } from "@/lib/actions/expenses";
import { Button, Card, Input } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

type CatView = {
  id: string;
  name: string;
  color: string;
  count: number;
  totalCents: number;
};

const PRESET_COLORS = [
  "#6366f1", "#22c55e", "#3b82f6", "#f59e0b",
  "#a855f7", "#ef4444", "#ec4899", "#06b6d4",
  "#14b8a6", "#f97316", "#8b5cf6", "#6b7280",
];

export function CategoryManager({
  categories,
  currency,
}: {
  categories: CatView[];
  currency: string;
}) {
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createCategory, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="space-y-5">
      {/* Ajout */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Nouvelle catégorie
        </h2>
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="color" value={color} />
          <Input name="name" placeholder="Nom (ex: Restaurant)" required maxLength={40} />

          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full transition ${
                  color === c ? "ring-2 ring-offset-2 ring-offset-surface" : ""
                }`}
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>

          {state?.error && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            {pending ? "Ajout…" : "Ajouter"}
          </Button>
        </form>
      </Card>

      {/* Liste */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Mes catégories ({categories.length})
        </h2>
        <ul className="divide-y divide-border">
          {categories.map((c) => (
            <CategoryItem key={c.id} cat={c} currency={currency} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function CategoryItem({ cat, currency }: { cat: CatView; currency: string }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (
      !confirm(
        `Supprimer « ${cat.name} » ? Les ${cat.count} dépense(s) liées passeront en « Sans catégorie ».`,
      )
    )
      return;
    startTransition(async () => {
      await deleteCategory(cat.id);
    });
  }

  return (
    <li className={`flex items-center gap-3 py-3 ${pending ? "opacity-40" : ""}`}>
      <span
        className="h-9 w-9 shrink-0 rounded-full"
        style={{ backgroundColor: cat.color }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{cat.name}</p>
        <p className="text-xs text-muted">
          {cat.count} dépense{cat.count > 1 ? "s" : ""} ·{" "}
          {formatMoney(cat.totalCents, currency)}
        </p>
      </div>
      <button
        onClick={onDelete}
        disabled={pending}
        title="Supprimer"
        className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
