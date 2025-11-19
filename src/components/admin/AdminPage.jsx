import React from "react";
import { Button } from "../ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "../ui/input";

export function AdminPage({
  title,
  description,
  onAdd,
  onSearch,
  searchPlaceholder = "Search...",
  children,
  headerActions,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center space-x-2">
            {onSearch && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder}
                  className="pl-8 w-[200px] md:w-[300px]"
                  onChange={(e) => onSearch(e.target.value)}
                />
              </div>
            )}
            {onAdd && (
              <Button onClick={onAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add New
              </Button>
            )}
            {headerActions}
          </div>
        </div>
      </div>

      <div className="rounded-md border">{children}</div>
    </div>
  );
}

export function AdminTable({ columns, data, renderRow, emptyMessage = "No data available" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {columns.map((column, index) => (
              <th
                key={index}
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
              >
                {column}
              </th>
            ))}
            <th className="w-[50px]" />
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((item, index) => renderRow(item, index))
          ) : (
            <tr>
              <td colSpan={columns.length + 1} className="h-24 text-center">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function CardGrid({ children }) {
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
