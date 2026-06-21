import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaybackTimeline } from "./playback-timeline";

describe("PlaybackTimeline", () => {
  it("renders timeline with correct aria attributes", () => {
    render(<PlaybackTimeline currentIndex={3} maxIndex={10} />);
    const slider = screen.getByRole("slider");
    expect(slider).toBeDefined();
    expect(slider.getAttribute("aria-valuenow")).toBe("3");
    expect(slider.getAttribute("aria-valuemin")).toBe("0");
    expect(slider.getAttribute("aria-valuemax")).toBe("10");
  });

  it("renders tool call markers", () => {
    const { container } = render(
      <PlaybackTimeline currentIndex={0} maxIndex={10} toolCallIndices={[2, 5]} />,
    );
    const markers = container.querySelectorAll("[class*='playback-timeline-marker']");
    expect(markers.length).toBe(2);
  });

  it("shows current index label", () => {
    render(<PlaybackTimeline currentIndex={4} maxIndex={10} />);
    expect(screen.getByText("4")).toBeDefined();
  });

  it("calls onSeek on click", () => {
    const onSeek = vi.fn();
    render(<PlaybackTimeline currentIndex={0} maxIndex={10} onSeek={onSeek} />);
    const slider = screen.getByRole("slider");
    fireEvent.click(slider);
    expect(onSeek).toHaveBeenCalled();
  });

  it("handles ArrowLeft keydown", () => {
    const onSeek = vi.fn();
    render(<PlaybackTimeline currentIndex={5} maxIndex={10} onSeek={onSeek} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(onSeek).toHaveBeenCalledWith(4);
  });

  it("handles ArrowRight keydown", () => {
    const onSeek = vi.fn();
    render(<PlaybackTimeline currentIndex={5} maxIndex={10} onSeek={onSeek} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onSeek).toHaveBeenCalledWith(6);
  });

  it("handles Home keydown", () => {
    const onSeek = vi.fn();
    render(<PlaybackTimeline currentIndex={5} maxIndex={10} onSeek={onSeek} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  it("handles End keydown", () => {
    const onSeek = vi.fn();
    render(<PlaybackTimeline currentIndex={5} maxIndex={10} onSeek={onSeek} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "End" });
    expect(onSeek).toHaveBeenCalledWith(10);
  });
});
