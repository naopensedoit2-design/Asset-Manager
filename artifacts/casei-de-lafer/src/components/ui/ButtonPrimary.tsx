import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonPrimaryProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
}

const ButtonPrimary = forwardRef<HTMLButtonElement, ButtonPrimaryProps>(
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
          "bg-gold text-black font-semibold uppercase tracking-widest",
          "transition-all duration-300 ease-out",
          "hover:bg-gold-light hover:shadow-[0_0_24px_rgba(201,168,76,0.4)]",
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

ButtonPrimary.displayName = "ButtonPrimary";

export default ButtonPrimary;
