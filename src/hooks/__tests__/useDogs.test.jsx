import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import useDogs from "../useDogs";
import { AuthContext } from "../../context/AuthContext";

// Mock supabase client (no-op to avoid network in tests)
vi.mock("../../lib/supabaseClient", () => ({
  __esModule: true,
  default: {
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({}) }) }) }),
    channel: () => ({ on: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }) }) }),
    removeChannel: () => {},
  },
}));

// Provide minimal AuthContext
// No wrapper used; tests run with explicit userId: null to avoid fetching

describe("useDogs hook basic", () => {
  beforeEach(() => {
    globalThis.__DB_DOGS_CACHE__ = {};
  });

  it("returns initial empty state without user", () => {
    const { result } = renderHook(() => useDogs({ userId: null }));
    expect(result.current.dogs).toEqual([]);
  });

  it("exposes refetch function", () => {
    const { result } = renderHook(() => useDogs({ userId: null }));
    expect(typeof result.current.refetch).toBe("function");
  });
});
