import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border font-display text-sm font-semibold uppercase tracking-wide transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "border-primary-border bg-primary text-primary-foreground shadow-[0_10px_26px_-12px_rgb(34_211_238_/_0.9)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-glow",
        destructive:
          "border-destructive-border bg-destructive text-destructive-foreground shadow-[0_10px_24px_-12px_rgb(239_68_68_/_0.8)] hover:-translate-y-0.5 hover:brightness-110",
        outline:
          "border-white/15 bg-white/[0.025] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)] hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_26px_-18px_rgb(34_211_238_/_0.7)]",
        secondary:
          "border-secondary-border bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)] hover:-translate-y-0.5 hover:border-white/20 hover:bg-zinc-700",
        ghost:
          "border-transparent text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
      },
      size: {
        default: "min-h-10 px-4 py-2",
        sm: "min-h-9 rounded-md px-3 text-xs",
        lg: "min-h-11 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
