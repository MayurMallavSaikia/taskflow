import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { alice, buildTask } from "@/test/fixtures";
import { TaskCard } from "./TaskCard";

describe("TaskCard", () => {
  it("shows the title, priority and assignee", () => {
    render(
      <TaskCard
        task={buildTask({ priority: "HIGH", assignee: alice })}
        onOpen={jest.fn()}
        onStatusChange={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Write the README" })).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("highlights overdue tasks", () => {
    render(
      <TaskCard
        task={buildTask({ dueDate: "2020-01-15", overdue: true })}
        onOpen={jest.fn()}
        onStatusChange={jest.fn()}
      />,
    );

    expect(screen.getByRole("article")).toHaveClass("task-card-overdue");
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
  });

  it("does not highlight tasks that are not overdue", () => {
    render(<TaskCard task={buildTask({ dueDate: "2099-01-15" })} onOpen={jest.fn()} onStatusChange={jest.fn()} />);

    expect(screen.getByRole("article")).not.toHaveClass("task-card-overdue");
    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
  });

  it("calls onStatusChange when a new status is picked", async () => {
    const onStatusChange = jest.fn();
    const task = buildTask();
    render(<TaskCard task={task} onOpen={jest.fn()} onStatusChange={onStatusChange} />);

    await userEvent.selectOptions(screen.getByRole("combobox", { name: /status for/i }), "IN_PROGRESS");

    expect(onStatusChange).toHaveBeenCalledWith(task, "IN_PROGRESS");
  });

  it("opens the task when the title is clicked", async () => {
    const onOpen = jest.fn();
    const task = buildTask();
    render(<TaskCard task={task} onOpen={onOpen} onStatusChange={jest.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Write the README" }));

    expect(onOpen).toHaveBeenCalledWith(task);
  });
});
