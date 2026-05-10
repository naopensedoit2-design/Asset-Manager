import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SectionWrapperProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "article";
  tight?: boolean;
}

export default function SectionWrapper({
  as: Tag = "section",
  tight = false,
  className,
  children,
  ...props
}: SectionWrapperProps) {
  return (
    <Tag
      className={cn(
        tight ? "py-14 md:py-16" : "py-20 md:py-28",
        className,
      )}
      {...props}
    >
      <div className="container mx-auto px-4 md:px-8 max-w-6xl">
        {children}
      </div>
    </Tag>
  );
}
