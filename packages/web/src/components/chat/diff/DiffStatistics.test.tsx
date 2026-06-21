import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiffStatistics } from "./DiffStatistics";
import type { DiffStatistics as DiffStats } from "../../../types/diff";

describe("DiffStatistics", () => {
  const stats: DiffStats = {
    linesAdded: 15,
    linesDeleted: 8,
    linesModified: 3,
    changeBlocks: 4,
    totalLines: 120,
  };

  it("renders added count", () => {
    render(<DiffStatistics stats={stats} />);
    expect(screen.getByText("+15")).toBeDefined();
  });

  it("renders deleted count", () => {
    render(<DiffStatistics stats={stats} />);
    expect(screen.getByText("-8")).toBeDefined();
  });

  it("renders modified count", () => {
    render(<DiffStatistics stats={stats} />);
    expect(screen.getByText("*3")).toBeDefined();
  });

  it("renders blocks count", () => {
    render(<DiffStatistics stats={stats} />);
    expect(screen.getByText("4")).toBeDefined();
  });

  it("renders total lines", () => {
    render(<DiffStatistics stats={stats} />);
    expect(screen.getByText("120 lines")).toBeDefined();
  });
});
