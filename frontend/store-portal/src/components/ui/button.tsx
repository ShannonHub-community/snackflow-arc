import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? "span" : "button"
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm",
          {
            "bg-slate-900 text-white hover:bg-slate-800": variant === "default",
            "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
            "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50": variant === "outline",
            "bg-slate-100 text-slate-900 hover:bg-slate-200": variant === "secondary",
            "hover:bg-slate-100 hover:text-slate-900 shadow-none": variant === "ghost",
            "text-blue-600 underline-offset-4 hover:underline shadow-none": variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-8 rounded-md px-3": size === "sm",
            "h-11 rounded-xl px-8 text-sm": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
