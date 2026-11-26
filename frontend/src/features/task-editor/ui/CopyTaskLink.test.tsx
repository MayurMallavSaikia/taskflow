import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyTaskLink } from "./CopyTaskLink";

describe("CopyTaskLink", () => {
  const originalClipboard = navigator.clipboard;

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true });
  });

  it("copies the task's full link to the clipboard", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    render(<CopyTaskLink projectId={10} taskId={7} />);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/projects/10/tasks/7`);
    expect(await screen.findByRole("button", { name: "Link copied!" })).toBeInTheDocument();
  });

  it("shows the link to copy by hand when the clipboard isn't available", async () => {
    render(<CopyTaskLink projectId={10} taskId={7} />);
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });

    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));

    expect(await screen.findByLabelText("Task link")).toHaveValue(`${window.location.origin}/projects/10/tasks/7`);
  });
});


