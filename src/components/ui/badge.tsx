import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-blue-100 text-blue-700",
  secondary: "bg-gray-100 text-gray-700",
  outline: "border border-gray-300 text-gray-700 bg-transparent",
  destructive: "bg-red-100 text-red-700",
  success: "bg-green-100 text-green-700",
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
