import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-0",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/15 text-primary shadow-[0_0_18px_-8px_rgb(34_211_238_/_0.8)]",
        secondary: "border-white/10 bg-white/[0.055] text-secondary-foreground",
        destructive:
          "border-destructive/35 bg-destructive/15 text-red-300 shadow-[0_0_18px_-8px_rgb(239_68_68_/_0.65)]",
        outline: "border-white/16 bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
