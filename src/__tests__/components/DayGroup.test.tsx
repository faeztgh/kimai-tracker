import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DayGroup } from "../../components/DayGroup";

describe("DayGroup", () => {
  it("renders the group label", () => {
    render(
      <DayGroup label="Mon, Jun 3" totalSeconds={0}>
        <div />
      </DayGroup>,
    );
    expect(screen.getByText("Mon, Jun 3")).toBeInTheDocument();
  });

  it("renders a short duration badge in hours when >= 1 h", () => {
    render(
      <DayGroup label="Today" totalSeconds={5400}>
        <div />
      </DayGroup>,
    );
    expect(screen.getByText("1:30 h")).toBeInTheDocument();
  });

  it("renders a short duration badge in minutes when < 1 h", () => {
    render(
      <DayGroup label="Yesterday" totalSeconds={1800}>
        <div />
      </DayGroup>,
    );
    expect(screen.getByText("30 min")).toBeInTheDocument();
  });

  it("renders children inside the group body", () => {
    render(
      <DayGroup label="Today" totalSeconds={3600}>
        <li>Entry 1</li>
        <li>Entry 2</li>
      </DayGroup>,
    );
    expect(screen.getByText("Entry 1")).toBeInTheDocument();
    expect(screen.getByText("Entry 2")).toBeInTheDocument();
  });
});
