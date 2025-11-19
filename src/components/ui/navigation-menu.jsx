import * as React from "react";
import { cn } from "../../lib/utils";
import { ChevronDown } from "lucide-react";
import { navigationMenuTriggerStyle } from "./navigation-menu-style";

const NavigationMenu = React.forwardRef(({ className, children, ...props }, ref) => (
  <nav ref={ref} className={cn("flex items-center space-x-1", className)} {...props}>
    {children}
  </nav>
));
NavigationMenu.displayName = "NavigationMenu";

const NavigationMenuList = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-1 list-none items-center justify-center space-x-1", className)}
    {...props}
  />
));
NavigationMenuList.displayName = "NavigationMenuList";

const NavigationMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("relative", className)} {...props} />
));
NavigationMenuItem.displayName = "NavigationMenuItem";

const NavigationMenuLink = React.forwardRef(({ className, children, ...props }, ref) => (
  <a ref={ref} className={cn(navigationMenuTriggerStyle, className)} {...props}>
    {children}
  </a>
));
NavigationMenuLink.displayName = "NavigationMenuLink";

const NavigationMenuTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <button ref={ref} className={cn(navigationMenuTriggerStyle, "group", className)} {...props}>
    {children}
    <ChevronDown
      className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </button>
));
NavigationMenuTrigger.displayName = "NavigationMenuTrigger";

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
};
