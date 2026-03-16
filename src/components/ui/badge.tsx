import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[var(--accent-bg)] text-[var(--accent)]",
  secondary: "bg-[var(--bg-hover)] text-[var(--text-secondary)]",
  outline: "border border-[var(--border-primary)] text-[var(--text-secondary)] bg-transparent",
  destructive: "bg-[var(--danger-bg)] text-[var(--danger)]",
  success: "bg-[var(--success-bg)] text-[var(--success)]",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge, type BadgeProps };
