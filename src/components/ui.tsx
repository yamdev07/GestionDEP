import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "md" | "lg" | "icon";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-primary text-primary-foreground hover:opacity-90 active:opacity-80",
    ghost: "hover:bg-surface-muted text-foreground",
    outline: "border border-border hover:bg-surface-muted text-foreground",
    danger: "bg-danger text-white hover:opacity-90",
  };
  const sizes: Record<string, string> = {
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-base",
    icon: "h-10 w-10",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}
