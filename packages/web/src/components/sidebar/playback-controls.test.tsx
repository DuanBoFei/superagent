import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaybackControls } from "./playback-controls";
import type { PlaybackSpeed } from "./playback-controls";

describe("PlaybackControls", () => {
  const baseProps = {
    currentIndex: 0,
    maxIndex: 10,
    isPlaying: false,
    speed: 1 as PlaybackSpeed,
  };

  it("renders play button when paused", () => {
    render(<PlaybackControls {...baseProps} />);
    const btn = screen.getByLabelText("Play");
    expect(btn).toBeDefined();
  });

  it("renders pause button when playing", () => {
    render(<PlaybackControls {...baseProps} isPlaying />);
    const btn = screen.getByLabelText("Pause");
    expect(btn).toBeDefined();
  });

  it("calls onPlay when play clicked", () => {
    const onPlay = vi.fn();
    render(<PlaybackControls {...baseProps} onPlay={onPlay} />);
    fireEvent.click(screen.getByLabelText("Play"));
    expect(onPlay).toHaveBeenCalled();
  });

  it("calls onPause when pause clicked", () => {
    const onPause = vi.fn();
    render(<PlaybackControls {...baseProps} isPlaying onPause={onPause} />);
    fireEvent.click(screen.getByLabelText("Pause"));
    expect(onPause).toHaveBeenCalled();
  });

  it("calls onStepForward when forward clicked", () => {
    const onStepForward = vi.fn();
    render(<PlaybackControls {...baseProps} onStepForward={onStepForward} />);
    fireEvent.click(screen.getByLabelText("Step forward"));
    expect(onStepForward).toHaveBeenCalled();
  });

  it("calls onStepBack when back clicked", () => {
    const onStepBack = vi.fn();
    render(<PlaybackControls {...baseProps} currentIndex={5} onStepBack={onStepBack} />);
    fireEvent.click(screen.getByLabelText("Step back"));
    expect(onStepBack).toHaveBeenCalled();
  });

  it("disables step back at start", () => {
    render(<PlaybackControls {...baseProps} currentIndex={0} />);
    const btn = screen.getByLabelText("Step back").closest("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("disables step forward at end", () => {
    render(<PlaybackControls {...baseProps} currentIndex={10} maxIndex={10} />);
    const btn = screen.getByLabelText("Step forward").closest("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("renders speed buttons", () => {
    render(<PlaybackControls {...baseProps} />);
    expect(screen.getByText("1x")).toBeDefined();
    expect(screen.getByText("2x")).toBeDefined();
    expect(screen.getByText("4x")).toBeDefined();
  });

  it("calls onSetSpeed when speed clicked", () => {
    const onSetSpeed = vi.fn();
    render(<PlaybackControls {...baseProps} onSetSpeed={onSetSpeed} />);
    fireEvent.click(screen.getByText("2x"));
    expect(onSetSpeed).toHaveBeenCalledWith(2);
  });

  it("shows current index and max", () => {
    render(<PlaybackControls {...baseProps} currentIndex={3} maxIndex={10} />);
    expect(screen.getByText("3")).toBeDefined();
  });

  it("calls onShowAll when show all clicked", () => {
    const onShowAll = vi.fn();
    render(<PlaybackControls {...baseProps} onShowAll={onShowAll} />);
    fireEvent.click(screen.getByText("Show all"));
    expect(onShowAll).toHaveBeenCalled();
  });
});
