import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary via-primary to-[hsl(38_80%_46%)] text-primary-foreground shadow-[inset_0_1px_0_0_hsl(42_90%_72%/0.35),inset_0_-1px_0_0_hsl(38_80%_40%/0.3),0_2px_8px_-2px_hsl(42_88%_56%/0.4),0_6px_20px_-6px_hsl(42_88%_44%/0.3)] hover:shadow-[inset_0_1px_0_0_hsl(42_90%_72%/0.4),inset_0_-1px_0_0_hsl(38_80%_40%/0.35),0_4px_16px_-2px_hsl(42_88%_56%/0.45),0_8px_28px_-6px_hsl(42_88%_44%/0.35)] hover:brightness-[1.04] active:brightness-[0.96] active:shadow-[inset_0_2px_4px_-1px_hsl(38_80%_30%/0.4),0_1px_4px_-1px_hsl(42_88%_56%/0.2)] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border/50 bg-transparent hover:bg-accent/30 hover:border-muted-foreground/15 text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent/30 hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        glass:
          "glass-card text-foreground/75 hover:text-foreground hover:border-[hsl(220_30%_55%/0.12)] active:scale-[0.98] active:shadow-[inset_0_1px_3px_-1px_hsl(226_30%_4%/0.3)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-xl px-3.5 text-xs",
        lg: "h-12 rounded-xl px-7",
        icon: "h-10 w-10",
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
