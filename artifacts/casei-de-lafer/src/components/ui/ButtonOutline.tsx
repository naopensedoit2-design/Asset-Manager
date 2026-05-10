import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonOutlineProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
}

const ButtonOutline = forwardRef<HTMLButtonElement, ButtonOutlineProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    const sizes = {
      sm: "px-5 py-2.5 text-xs",
      md: "px-8 py-3.5 text-sm",
      lg: "px-10 py-4 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2",
          "border border-gold text-gold font-semibold uppercase tracking-widest",
          "bg-transparent",
          "transition-all duration-300 ease-out",
          "hover:bg-gold hover:text-black hover:shadow-[0_0_24px_rgba(201,168,76,0.3)]",
          "active:scale-[0.97]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "cursor-pointer select-none",
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

ButtonOutline.displayName = "ButtonOutline";

export default ButtonOutline;
