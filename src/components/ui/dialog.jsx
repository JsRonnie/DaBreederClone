import React from "react";

export function Dialog({ children, open, onOpenChange, ...props }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => onOpenChange?.(false)}
    >
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative bg-white rounded-lg shadow-lg max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, ...props }) {
  return (
    <div className="p-6" {...props}>
      {children}
    </div>
  );
}

export function DialogHeader({ children, ...props }) {
  return (
    <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4" {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, ...props }) {
  return (
    <h2 className="text-lg font-semibold leading-none tracking-tight" {...props}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, ...props }) {
  return (
    <p className="text-sm text-muted-foreground" {...props}>
      {children}
    </p>
  );
}

export function DialogFooter({ children, ...props }) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6" {...props}>
      {children}
    </div>
  );
}
