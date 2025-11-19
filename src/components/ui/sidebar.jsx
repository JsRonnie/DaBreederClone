import * as React from "react";
import { cn } from "../../lib/utils";

const Sidebar = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-screen w-64 flex-col border-r bg-background", className)}
    {...props}
  />
));
Sidebar.displayName = "Sidebar";

const SidebarHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex h-16 items-center border-b px-6", className)} {...props} />
));
SidebarHeader.displayName = "SidebarHeader";

const SidebarContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 overflow-y-auto py-4", className)} {...props} />
));
SidebarContent.displayName = "SidebarContent";

const SidebarFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("border-t p-4", className)} {...props} />
));
SidebarFooter.displayName = "SidebarFooter";

export { Sidebar, SidebarHeader, SidebarContent, SidebarFooter };
