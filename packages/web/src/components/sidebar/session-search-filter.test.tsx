import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionSearchFilter } from "./session-search-filter";
import { useSessionHistoryStore } from "../../store/session-history";

beforeEach(() => {
  useSessionHistoryStore.getState().reset();
});

describe("SessionSearchFilter", () => {
  it("renders search input", () => {
    render(<SessionSearchFilter availableTags={[]} />);
    expect(
      screen.getByPlaceholderText(/search sessions/i),
    ).toBeDefined();
  });

  it("updates search query text via store", async () => {
    const user = userEvent.setup();
    render(<SessionSearchFilter availableTags={[]} />);
    const input = screen.getByPlaceholderText(/search sessions/i);
    await user.type(input, "auth");
    // Wait for debounce
    await new Promise((r) => setTimeout(r, 250));
    expect(useSessionHistoryStore.getState().searchQuery.text).toBe("auth");
  });

  it("renders date preset buttons", () => {
    render(<SessionSearchFilter availableTags={[]} />);
    expect(screen.getByText("Today")).toBeDefined();
    expect(screen.getByText("Last 7 days")).toBeDefined();
    expect(screen.getByText("Last 30 days")).toBeDefined();
    expect(screen.getByText("All time")).toBeDefined();
  });

  it("shows reset filters button when filters active", () => {
    useSessionHistoryStore.getState().setSearchQuery({ text: "test" });
    render(<SessionSearchFilter availableTags={[]} />);
    expect(screen.getByText(/reset/i)).toBeDefined();
  });

  it("clears all filters on reset click", () => {
    useSessionHistoryStore.getState().setSearchQuery({
      text: "test",
    });
    render(<SessionSearchFilter availableTags={[]} />);
    fireEvent.click(screen.getByText(/reset/i));
    const q = useSessionHistoryStore.getState().searchQuery;
    expect(q.text).toBe("");
    expect(q.dateRange).toBeNull();
  });

  it("shows clear button when text has value", () => {
    useSessionHistoryStore.getState().setSearchQuery({ text: "test" });
    render(<SessionSearchFilter availableTags={[]} />);
    const input = screen.getByPlaceholderText(/search sessions/i) as HTMLInputElement;
    expect(input.value).toBe("test");
  });
});
