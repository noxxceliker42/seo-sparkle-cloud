import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-none border border-primary/30 bg-card/90 backdrop-blur-sm text-card-foreground shadow-[var(--shadow-console)] relative",
      "before:absolute before:top-[-1px] before:left-[-1px] before:w-3.5 before:h-3.5 before:border-t-2 before:border-l-2 before:border-primary before:pointer-events-none before:[box-shadow:0_0_6px_var(--phosphor-glow)]",
      "after:absolute after:bottom-[-1px] after:right-[-1px] after:w-3.5 after:h-3.5 after:border-b-2 after:border-r-2 after:border-primary after:pointer-events-none after:[box-shadow:0_0_6px_var(--phosphor-glow)]",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 border-b border-primary/20 bg-primary/5", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xl font-bold uppercase tracking-[0.15em] leading-none text-primary flex items-center gap-2 before:content-['>'] before:text-primary/70", className)}
    style={{ fontFamily: 'var(--font-display)', textShadow: '0 0 8px var(--phosphor-glow-strong)' }}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs text-muted-foreground font-mono uppercase tracking-wider", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-6", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
