import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ConfirmProvider, useConfirm, type ConfirmOptions } from "../../components/ConfirmDialog";

// Helper component that opens the dialog on button click and records the result
function DialogTrigger({ options, label = "Open" }: { options: ConfirmOptions; label?: string }) {
  const confirm = useConfirm();
  const [result, setResult] = useState<boolean | null>(null);

  return (
    <div>
      <button onClick={() => void confirm(options).then(setResult)}>{label}</button>
      {result !== null && <div data-testid="result">{String(result)}</div>}
    </div>
  );
}

function renderDialog(options: ConfirmOptions, label?: string) {
  return render(
    <ConfirmProvider>
      <DialogTrigger options={options} label={label} />
    </ConfirmProvider>,
  );
}

describe("ConfirmDialog", () => {
  it("does not render the dialog before it is triggered", () => {
    renderDialog({ title: "Delete?" });
    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
  });

  it("shows title and message after the trigger button is clicked", async () => {
    renderDialog({ title: "Delete entry?", message: "This cannot be undone." });
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Delete entry?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("resolves with true when Confirm button is clicked", async () => {
    renderDialog({ title: "Proceed?" });
    await userEvent.click(screen.getByText("Open"));
    await userEvent.click(screen.getByText("Confirm"));
    await waitFor(() => expect(screen.getByTestId("result").textContent).toBe("true"));
  });

  it("resolves with false when Cancel button is clicked", async () => {
    renderDialog({ title: "Proceed?" });
    await userEvent.click(screen.getByText("Open"));
    await userEvent.click(screen.getByText("Cancel"));
    await waitFor(() => expect(screen.getByTestId("result").textContent).toBe("false"));
  });

  it("uses custom confirmLabel and cancelLabel props", async () => {
    renderDialog({ title: "OK?", confirmLabel: "Yes, delete", cancelLabel: "No thanks" });
    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Yes, delete")).toBeInTheDocument();
    expect(screen.getByText("No thanks")).toBeInTheDocument();
  });

  it("hides the Cancel button in alert mode", async () => {
    renderDialog({ title: "Info", alert: true });
    await userEvent.click(screen.getByText("Open"));
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
  });

  it("resolves with false on Escape key", async () => {
    renderDialog({ title: "Proceed?" });
    await userEvent.click(screen.getByText("Open"));
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.getByTestId("result").textContent).toBe("false"));
  });

  it("resolves with true on Enter key", async () => {
    renderDialog({ title: "Proceed?" });
    await userEvent.click(screen.getByText("Open"));
    fireEvent.keyDown(document, { key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("result").textContent).toBe("true"));
  });

  it("throws when useConfirm is used outside a ConfirmProvider", () => {
    // Suppress React error boundary noise in test output
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <DialogTrigger options={{ title: "?" }} />,
      ),
    ).toThrow("useConfirm must be used within a ConfirmProvider");
    spy.mockRestore();
  });
});
