import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTick } from "../../hooks/useTick";

describe("useTick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a number (timestamp) immediately", () => {
    const { result } = renderHook(() => useTick(false));
    expect(typeof result.current).toBe("number");
    expect(result.current).toBeGreaterThan(0);
  });

  it("does not create an interval when disabled", () => {
    const spy = vi.spyOn(global, "setInterval");
    renderHook(() => useTick(false));
    // The interval should NOT have been called
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("creates an interval every second when enabled", () => {
    const spy = vi.spyOn(global, "setInterval");
    renderHook(() => useTick(true));
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 1000);
    spy.mockRestore();
  });

  it("returns an updated timestamp after a second elapses", () => {
    const { result } = renderHook(() => useTick(true));
    const initial = result.current;
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBeGreaterThan(initial);
  });

  it("clears the interval on unmount", () => {
    const spy = vi.spyOn(global, "clearInterval");
    const { unmount } = renderHook(() => useTick(true));
    unmount();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
