import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold tracking-[0.01em] ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation max-sm:min-h-11 max-sm:min-w-11 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.985]",
  {
    variants: {
      variant: {
        default: "border border-white/35 bg-primary text-primary-foreground shadow-card hover:-translate-y-0.5 hover:brightness-105 hover:shadow-elevated",
        destructive: "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90",
        outline: "border border-border/80 bg-card/60 text-foreground shadow-soft hover:border-primary/50 hover:bg-secondary/70",
        secondary: "border border-border/60 bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        ghost: "text-foreground/75 hover:bg-secondary/70 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        confirm: "border border-white/35 bg-primary text-primary-foreground shadow-card hover:-translate-y-0.5 hover:brightness-105 hover:shadow-elevated",
        request: "border border-accent/50 bg-accent/15 text-accent-foreground shadow-soft hover:bg-accent/25",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-10 rounded-xl px-4 text-xs sm:h-9",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-11 w-11 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
