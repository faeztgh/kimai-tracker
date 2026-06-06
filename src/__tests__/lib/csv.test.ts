import { describe, it, expect, vi } from "vitest";
import { toCsv, downloadTextFile } from "../../lib/csv";

describe("toCsv", () => {
  it("joins headers and rows with commas and CRLF", () => {
    const result = toCsv(["Date", "Project"], [
      ["2024-01-01", "Dev"],
      ["2024-01-02", "Design"],
    ]);
    const lines = result.split("\r\n");
    expect(lines[0]).toBe("Date,Project");
    expect(lines[1]).toBe("2024-01-01,Dev");
    expect(lines[2]).toBe("2024-01-02,Design");
  });

  it("escapes values that contain commas with double-quotes", () => {
    const result = toCsv(["Name"], [["Smith, John"]]);
    expect(result).toContain('"Smith, John"');
  });

  it('escapes values that contain double-quotes by doubling them', () => {
    const result = toCsv(["Note"], [['He said "hello"']]);
    expect(result).toContain('"He said ""hello"""');
  });

  it("escapes values containing newlines", () => {
    const result = toCsv(["Desc"], [["line1\nline2"]]);
    expect(result).toContain('"line1\nline2"');
  });

  it("coerces numbers to strings", () => {
    const result = toCsv(["Seconds", "Rate"], [[3600, 99.5]]);
    expect(result).toContain("3600");
    expect(result).toContain("99.5");
  });

  it("produces only a header row when rows array is empty", () => {
    const result = toCsv(["A", "B"], []);
    expect(result).toBe("A,B");
  });
});

describe("downloadTextFile", () => {
  it("creates a temporary anchor, clicks it, and removes it", () => {
    const createObjectURL = vi.fn(() => "blob:test-url");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(global, "URL", {
      writable: true,
      value: { createObjectURL, revokeObjectURL },
    });

    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((el) => el);
    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((el) => el);
    const clickSpy = vi.fn();

    const origCreate = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag) => {
        if (tag === "a") {
          const el = origCreate("a");
          el.click = clickSpy;
          return el;
        }
        return origCreate(tag);
      });

    downloadTextFile("report.csv", "a,b\r\n1,2");

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-url");

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createElementSpy.mockRestore();
  });
});
