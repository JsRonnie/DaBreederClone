import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const skeletonVariants = cva("animate-pulse rounded-md bg-muted", {
  variants: {
    variant: {
      default: "h-4 w-full",
      circle: "rounded-full",
      rect: "h-24 w-full",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Skeleton({ className, variant, ...props }) {
  return <div className={cn(skeletonVariants({ variant }), className)} {...props} />;
}

export { Skeleton };
