import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[hsl(213_75%_52%)] via-primary to-[hsl(213_73%_32%)] text-primary-foreground shadow-[inset_0_1.5px_0_0_hsl(213_75%_64%/0.6),inset_0_-1px_0_0_hsl(213_73%_26%/0.35),inset_0_0_12px_0_hsl(192_72%_70%/0.06),0_1px_2px_0_hsl(213_65%_28%/0.12),0_4px_12px_-2px_hsl(213_73%_40%/0.28),0_8px_28px_-6px_hsl(213_73%_40%/0.2)] hover:shadow-[inset_0_1.5px_0_0_hsl(213_75%_66%/0.65),inset_0_-1px_0_0_hsl(213_73%_26%/0.4),inset_0_0_16px_0_hsl(192_72%_70%/0.08),0_2px_6px_-1px_hsl(213_65%_28%/0.15),0_6px_18px_-2px_hsl(213_73%_40%/0.32),0_12px_36px_-6px_hsl(213_73%_40%/0.22)] hover:brightness-[1.04] active:brightness-[0.92] active:shadow-[inset_0_2px_8px_-1px_hsl(213_73%_24%/0.45),0_1px_3px_-1px_hsl(213_73%_40%/0.12)] active:scale-[0.97]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent hover:bg-primary/5 hover:border-primary/20 text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost:
          "hover:bg-primary/5 hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        glass:
          "glass-card hover:border-[hsl(213_30%_75%/0.5)] text-foreground/65 hover:text-foreground active:scale-[0.97] active:shadow-[inset_0_1px_4px_-1px_hsl(213_25%_68%/0.15)]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-xl px-3.5 text-xs",
        lg: "h-12 rounded-2xl px-8",
        icon: "h-11 w-11",
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
