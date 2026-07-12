import * as React from "react"
import { cn } from "../../lib/utils"

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "outline" }>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
          {
            "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80": variant === "default",
            "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-100/80": variant === "secondary",
            "border-transparent bg-red-50 text-red-700 hover:bg-red-50/80": variant === "destructive",
            "text-slate-950 border border-slate-200 bg-white": variant === "outline",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
