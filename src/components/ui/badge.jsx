import * as React from "react";
import { cn } from "../../lib/utils";
import { badgeVariants } from "./badge-variants";

function Badge({ className, variant, ...props }) {
  // ...existing code...
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
