import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import useFormData from "../useFormData";

// Mock supabase client and helpers
vi.mock("../../lib/supabaseClient", () => ({
  __esModule: true,
  default: {
    from: (table) => {
      if (table === "dogs") {
        return {
          insert: () => ({
            select: () => ({ single: () => Promise.resolve({ data: { id: 101 }, error: null }) }),
          }),
          update: () => Promise.resolve({ error: null }),
          eq: () => ({}),
        };
      }
      return {
        insert: () => ({
          select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
        }),
      };
    },
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "http://example.com" } })),
      })),
    },
  },
}));

vi.mock("../../lib/auth", () => ({
  __esModule: true,
  safeGetUser: vi.fn(async () => ({ data: { user: null }, error: null })),
}));

function TestForm() {
  const form = useFormData();
  return (
    <div>
      <input
        aria-label="name"
        value={form.data.name}
        onChange={(e) => form.updateField("name", e.target.value)}
      />
      <input
        aria-label="gender"
        value={form.data.gender}
        onChange={(e) => form.updateField("gender", e.target.value)}
      />
      <input
        aria-label="age_years"
        value={form.data.age_years}
        onChange={(e) => form.updateField("age_years", e.target.value)}
      />
      <button onClick={() => form.submit()}>submit</button>
      {form.error && <div role="alert">{form.error.message}</div>}
    </div>
  );
}

describe("useFormData submit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("requires authentication", async () => {
    render(<TestForm />);
    // Fill in minimal valid fields so auth check is hit
    fireEvent.change(screen.getByLabelText("name"), { target: { value: "Rex" } });
    fireEvent.change(screen.getByLabelText("gender"), { target: { value: "male" } });
    fireEvent.change(screen.getByLabelText("age_years"), { target: { value: "2" } });
    fireEvent.click(screen.getByText("submit"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/sign in/i);
    });
  });

  it("submits when authenticated and returns an id", async () => {
    const { safeGetUser } = await import("../../lib/auth");
    safeGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } }, error: null });

    const SuccessForm = () => {
      const form = useFormData();
      return (
        <div>
          <input
            aria-label="name"
            value={form.data.name}
            onChange={(e) => form.updateField("name", e.target.value)}
          />
          <input
            aria-label="gender"
            value={form.data.gender}
            onChange={(e) => form.updateField("gender", e.target.value)}
          />
          <input
            aria-label="age_years"
            value={form.data.age_years}
            onChange={(e) => form.updateField("age_years", e.target.value)}
          />
          <button
            onClick={async () => {
              const id = await form.submit();
              const span = document.createElement("span");
              span.setAttribute("data-id", String(id));
              span.textContent = String(id);
              document.body.appendChild(span);
            }}
          >
            go
          </button>
        </div>
      );
    };

    render(<SuccessForm />);
    fireEvent.change(screen.getByLabelText("name"), { target: { value: "Rex" } });
    fireEvent.change(screen.getByLabelText("gender"), { target: { value: "male" } });
    fireEvent.change(screen.getByLabelText("age_years"), { target: { value: "2" } });
    fireEvent.click(screen.getByText("go"));
    await waitFor(() => {
      const el = document.querySelector("span[data-id]");
      expect(el).toBeTruthy();
      expect(el.textContent).toBe("101");
    });
  });
});
