import { describe, it, expect } from "vitest";
import { colorForId } from "../../hooks/useEntities";

const PALETTE_SIZE = 12;

describe("colorForId", () => {
  it("returns an explicit hex color when provided", () => {
    expect(colorForId(1, "#ff0000")).toBe("#ff0000");
    expect(colorForId(99, "#abc123")).toBe("#abc123");
  });

  it("falls back to palette when no explicit color given", () => {
    const color = colorForId(0);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("falls back to palette when explicit color has no leading #", () => {
    const color = colorForId(1, "red");
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("falls back to palette when explicit color is null", () => {
    const color = colorForId(1, null);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("rotates palette by id modulo palette size", () => {
    // IDs n and n+PALETTE_SIZE must produce the same colour
    for (let i = 0; i < 5; i++) {
      expect(colorForId(i)).toBe(colorForId(i + PALETTE_SIZE));
    }
  });

  it("handles large IDs gracefully", () => {
    const color = colorForId(999_999);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("handles id=0 without crashing", () => {
    expect(() => colorForId(0)).not.toThrow();
  });
});
