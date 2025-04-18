
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        secondary:
          "border-transparent bg-amber-500 text-white hover:bg-amber-600",
        destructive:
          "border-transparent bg-red-500 text-white hover:bg-red-600",
        outline: "text-foreground bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
        // Patient status types
        clear: "border-transparent bg-green-500 text-white hover:bg-green-600",
        pending: "border-transparent bg-amber-500 text-white hover:bg-amber-600",
        critical: "border-transparent bg-red-500 text-white hover:bg-red-600",
        discharged: "border-transparent bg-blue-400 text-white hover:bg-blue-500",
        active: "border-transparent bg-green-500 text-white hover:bg-green-600",
        admitted: "border-transparent bg-green-500 text-white hover:bg-green-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
