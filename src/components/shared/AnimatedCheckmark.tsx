import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCheckmarkProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function AnimatedCheckmark({ 
  className, 
  size = 48, 
  strokeWidth = 3, 
  color = "currentColor" 
}: AnimatedCheckmarkProps) {
  return (
    <div 
      className={cn("flex items-center justify-center rounded-full", className)}
      style={{ width: size * 2, height: size * 2 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.circle
          cx="25"
          cy="25"
          r="23"
          stroke={color}
          strokeWidth={strokeWidth}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.path
          d="M15 25.5L22 32.5L35 17.5"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}
