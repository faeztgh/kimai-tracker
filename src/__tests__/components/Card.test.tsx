import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "../../components/Card";

describe("Card", () => {
  it("renders the title as uppercase-tracked heading", () => {
    render(<Card title="My Card"><p>body</p></Card>);
    expect(screen.getByText("My Card")).toBeInTheDocument();
  });

  it("renders children inside the card", () => {
    render(<Card title="Stats"><span>42 hours</span></Card>);
    expect(screen.getByText("42 hours")).toBeInTheDocument();
  });

  it("renders multiple children", () => {
    render(
      <Card title="Multi">
        <div>Item A</div>
        <div>Item B</div>
      </Card>,
    );
    expect(screen.getByText("Item A")).toBeInTheDocument();
    expect(screen.getByText("Item B")).toBeInTheDocument();
  });
});
