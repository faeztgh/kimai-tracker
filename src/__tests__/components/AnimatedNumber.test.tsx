import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AnimatedNumber } from "../../components/AnimatedNumber";
import { useSettings } from "../../store/settings";

describe("AnimatedNumber", () => {
  describe("with animation disabled", () => {
    beforeEach(() => {
      useSettings.setState({ animateDigits: false });
    });

    it("renders value in a single span", () => {
      render(<AnimatedNumber value="1:23:45" />);
      expect(screen.getByText("1:23:45")).toBeInTheDocument();
    });

    it("forwards the className prop", () => {
      const { container } = render(
        <AnimatedNumber value="0:00" className="timer-font" />,
      );
      const span = container.querySelector("span.timer-font");
      expect(span).not.toBeNull();
    });

    it("renders an empty string without crashing", () => {
      render(<AnimatedNumber value="" />);
    });
  });

  describe("with animation enabled", () => {
    beforeEach(() => {
      useSettings.setState({ animateDigits: true });
    });

    it("text content equals the value prop", () => {
      const { container } = render(<AnimatedNumber value="1:23" />);
      expect(container.textContent).toBe("1:23");
    });

    it("renders one roll-cell per character", () => {
      const { container } = render(<AnimatedNumber value="1:23" />);
      const cells = container.querySelectorAll(".roll-cell");
      expect(cells.length).toBe(4); // '1', ':', '2', '3'
    });
  });
});
