import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Elapsed } from "../../components/Elapsed";
import { useSettings } from "../../store/settings";

describe("Elapsed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSettings.setState({ animateDigits: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders formatted elapsed time immediately", () => {
    const begin = new Date(Date.now() - 65_000).toISOString(); // 1 min 5 sec ago
    render(<Elapsed begin={begin} />);
    expect(screen.getByText("1:05")).toBeInTheDocument();
  });

  it("shows 0:00 for a begin time equal to now", () => {
    const begin = new Date(Date.now()).toISOString();
    render(<Elapsed begin={begin} />);
    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("increments each second via setInterval", () => {
    const begin = new Date(Date.now()).toISOString();
    render(<Elapsed begin={begin} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("0:03")).toBeInTheDocument();
  });

  it("forwards the className prop to the inner span", () => {
    const begin = new Date(Date.now()).toISOString();
    const { container } = render(
      <Elapsed begin={begin} className="elapsed-text" />,
    );
    const span = container.querySelector("span.elapsed-text");
    expect(span).not.toBeNull();
  });

  it("clears the interval on unmount (no memory leak)", () => {
    const spy = vi.spyOn(global, "clearInterval");
    const begin = new Date(Date.now()).toISOString();
    const { unmount } = render(<Elapsed begin={begin} />);
    unmount();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
