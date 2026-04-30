import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
  animate?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  animate = true,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-10 flex flex-col items-center justify-center text-center overflow-hidden relative",
        animate && "animate-fade-in",
        className
      )}
    >
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 mb-6">
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Outer glow ring */}
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse-soft" />
          
          {/* Inner glass circle */}
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full glass-elevated border border-primary/20 bg-background/50 backdrop-blur-md">
            <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          
          {/* Floating particle effect (CSS only via pseudo elements, or just static dots) */}
          <div className="absolute top-0 right-2 w-2 h-2 bg-primary/40 rounded-full animate-float" style={{ animationDelay: "0ms" }} />
          <div className="absolute bottom-2 left-0 w-1.5 h-1.5 bg-primary/30 rounded-full animate-float" style={{ animationDelay: "1000ms" }} />
          <div className="absolute -top-1 -left-1 w-1 h-1 bg-primary/50 rounded-full animate-float" style={{ animationDelay: "500ms" }} />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-foreground tracking-tight mb-2 relative z-10">
        {title}
      </h3>
      <div className="text-sm text-muted-foreground max-w-[280px] mx-auto mb-6 relative z-10 leading-relaxed">
        {description}
      </div>

      {action && (
        <div className="relative z-10">
          {action}
        </div>
      )}
    </div>
  );
}
