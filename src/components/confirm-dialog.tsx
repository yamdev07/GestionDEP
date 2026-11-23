"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type ConfirmTone = "danger" | "primary";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Confirmation stylée (remplace le `window.confirm` natif). */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm doit être utilisé dans <ConfirmProvider>.");
  }
  return ctx;
}

type Pending = { options: ConfirmOptions; resolve: (value: boolean) => void };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setPending((prev) => {
      prev?.resolve(result);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <ConfirmModal
          options={pending.options}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmModal({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const {
    title,
    message,
    confirmLabel = "Confirmer",
    cancelLabel = "Annuler",
    tone = "danger",
  } = options;

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const raf = requestAnimationFrame(() => setVisible(true));

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);

    // Verrouille le défilement de l'arrière-plan.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted, onCancel]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Fond assombri */}
      <div
        onClick={onCancel}
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Carte */}
      <div
        className={cn(
          "relative w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-2xl transition-all duration-200",
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-6 scale-95 opacity-0 sm:translate-y-0",
        )}
      >
        <div className="flex flex-col items-center text-center">
          <span
            className={cn(
              "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
              tone === "danger"
                ? "bg-danger/10 text-danger"
                : "bg-primary/10 text-primary",
            )}
          >
            <AlertTriangle className="h-7 w-7" />
          </span>

          {title && (
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
          )}
          <p className="mt-1.5 text-sm text-muted">{message}</p>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
