import * as React from "react";

export function Table({ children, ...props }) {
  return <table {...props}>{children}</table>;
}

export function TableHeader({ children, ...props }) {
  return <thead {...props}>{children}</thead>;
}

export function TableRow({ children, ...props }) {
  return <tr {...props}>{children}</tr>;
}

export function TableHead({ children, ...props }) {
  return <th {...props}>{children}</th>;
}

export function TableBody({ children, ...props }) {
  return <tbody {...props}>{children}</tbody>;
}

export function TableCell({ children, ...props }) {
  return <td {...props}>{children}</td>;
}
