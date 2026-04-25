import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-semibold uppercase tracking-[0.15em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-mono",
  {
    variants: {
      variant: {
        default:
          "bg-transparent text-primary border border-primary shadow-[0_0_8px_var(--phosphor-glow)] hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_var(--phosphor-glow-strong)]",
        destructive:
          "bg-transparent text-destructive border border-destructive shadow-[0_0_8px_oklch(0.65_0.28_28_/_50%)] hover:bg-destructive hover:text-destructive-foreground hover:shadow-[0_0_20px_oklch(0.65_0.28_28_/_80%)]",
        outline:
          "border border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:border-primary hover:shadow-[0_0_12px_var(--phosphor-glow)]",
        secondary:
          "bg-transparent text-accent border border-accent/60 shadow-[0_0_8px_var(--amber-glow)] hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_18px_var(--amber-glow)]",
        ghost: "text-primary hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_8px_var(--phosphor-glow)]",
        link: "text-primary underline-offset-4 hover:underline normal-case tracking-normal",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
