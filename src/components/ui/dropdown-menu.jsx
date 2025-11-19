import React from "react";

export function DropdownMenu({ children, ...props }) {
  return (
    <div className="dropdown-menu" {...props}>
      {children}
    </div>
  );
}

export function DropdownMenuTrigger({ children, ...props }) {
  return (
    <button className="dropdown-menu-trigger" {...props}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({ children, ...props }) {
  return (
    <div className="dropdown-menu-content" {...props}>
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, ...props }) {
  return (
    <div className="dropdown-menu-item" {...props}>
      {children}
    </div>
  );
}
