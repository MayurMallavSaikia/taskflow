import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { tasksApi } from "@/entities/task/api/tasksApi";
import { alice, bob, buildTask } from "@/test/fixtures";
import { renderWithProviders } from "@/test/renderWithProviders";
import { TaskForm } from "./TaskForm";

jest.mock("@/entities/task/api/tasksApi");
const mockedTasksApi = jest.mocked(tasksApi);

describe("TaskForm", () => {
  beforeEach(() => jest.resetAllMocks());

  it("shows field errors and does not call the API when the title is missing", async () => {
    renderWithProviders(<TaskForm projectId={10} users={[alice]} onDone={jest.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(mockedTasksApi.create).not.toHaveBeenCalled();
  });

  it("rejects a due date in the past", async () => {
    renderWithProviders(<TaskForm projectId={10} users={[alice]} onDone={jest.fn()} />);

    await userEvent.type(screen.getByLabelText("Title"), "Plan sprint");
    await userEvent.type(screen.getByLabelText("Due date"), "2020-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(screen.getByText("Due date cannot be in the past")).toBeInTheDocument();
    expect(mockedTasksApi.create).not.toHaveBeenCalled();
  });

  it("creates a task with the entered values", async () => {
    mockedTasksApi.create.mockResolvedValue(buildTask());
    const onDone = jest.fn();
    renderWithProviders(<TaskForm projectId={10} users={[alice, bob]} onDone={onDone} />);

    await userEvent.type(screen.getByLabelText("Title"), "  Plan sprint ");
    await userEvent.selectOptions(screen.getByLabelText("Priority"), "HIGH");
    await userEvent.selectOptions(screen.getByLabelText("Assignee"), "Bob");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockedTasksApi.create).toHaveBeenCalledWith(10, {
      title: "Plan sprint",
      description: undefined,
      priority: "HIGH",
      dueDate: null,
      assigneeId: 2,
    });
  });

  it("shows server-side field errors", async () => {
    mockedTasksApi.create.mockRejectedValue(
      Object.assign(new Error("Request failed"), {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            status: 400,
            error: "Bad Request",
            message: "Validation failed",
            path: "/api/projects/10/tasks",
            fieldErrors: [{ field: "assigneeId", message: "Assignee 2 does not exist" }],
          },
        },
      }),
    );
    renderWithProviders(<TaskForm projectId={10} users={[alice, bob]} onDone={jest.fn()} />);

    await userEvent.type(screen.getByLabelText("Title"), "Plan sprint");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));

    expect(await screen.findByText("Assignee 2 does not exist")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Validation failed");
  });

  it("pre-fills the form and sends the status when editing", async () => {
    const task = buildTask({ id: 7, title: "Old title", status: "IN_PROGRESS", assignee: alice });
    mockedTasksApi.update.mockResolvedValue(task);
    const onDone = jest.fn();
    renderWithProviders(<TaskForm projectId={10} users={[alice]} task={task} onDone={onDone} />);

    expect(screen.getByLabelText("Title")).toHaveValue("Old title");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "DONE");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockedTasksApi.update).toHaveBeenCalledWith(7, expect.objectContaining({ status: "DONE", assigneeId: 1 }));
  });
});
