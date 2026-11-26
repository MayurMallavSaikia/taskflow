import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { Route, Routes, useLocation } from "react-router-dom";
import { projectsApi } from "@/entities/project/api/projectsApi";
import { tasksApi } from "@/entities/task/api/tasksApi";
import type { Task } from "@/entities/task";
import { sessionStorage } from "@/features/auth";
import { alice, buildTask } from "@/test/fixtures";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ProjectBoardPage } from "./ProjectBoardPage";

jest.mock("@/entities/project/api/projectsApi", () => ({
  projectsApi: { get: jest.fn(), summary: jest.fn(), members: jest.fn() },
}));
jest.mock("@/entities/task/api/tasksApi", () => ({
  tasksApi: { list: jest.fn(), board: jest.fn(), get: jest.fn(), activity: jest.fn() },
}));

const mockedProjectsApi = projectsApi as jest.Mocked<typeof projectsApi>;
const mockedTasksApi = tasksApi as jest.Mocked<typeof tasksApi>;

const task: Task = buildTask({ id: 7, projectId: 10, title: "Write the launch post", status: "TODO" });

const LocationDisplay = () => {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
};

function renderBoard(route: string) {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectBoardPage />} />
        <Route path="/projects/:projectId/tasks/:taskId" element={<ProjectBoardPage />} />
      </Routes>
      <LocationDisplay />
    </>,
    { route },
  );
}

function notFoundError() {
  return new AxiosError("Not found", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 404,
    statusText: "Not Found",
    data: { message: "Task 999 not found" },
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe("ProjectBoardPage task links", () => {
  beforeEach(() => {
    sessionStorage.save({ token: "t", expiresAt: new Date(Date.now() + 60_000).toISOString(), user: alice });
    mockedProjectsApi.get.mockResolvedValue({ id: 10, name: "Launch", description: null, owner: alice, createdAt: "" });
    mockedProjectsApi.summary.mockResolvedValue({
      projectId: 10,
      total: 1,
      countsByStatus: { TODO: 1, IN_PROGRESS: 0, DONE: 0 },
      overdue: 0,
    });
    mockedProjectsApi.members.mockResolvedValue([alice]);
    mockedTasksApi.board.mockResolvedValue({
      columns: {
        TODO: { tasks: [task], total: 1 },
        IN_PROGRESS: { tasks: [], total: 0 },
        DONE: { tasks: [], total: 0 },
      },
    });
    mockedTasksApi.get.mockResolvedValue(task);
    mockedTasksApi.activity.mockResolvedValue([]);
  });

  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it("loads all three columns with a single request", async () => {
    renderBoard("/projects/10?q=launch");

    expect(await screen.findByRole("button", { name: "Write the launch post" })).toBeInTheDocument();
    expect(mockedTasksApi.board).toHaveBeenCalledTimes(1);
    expect(mockedTasksApi.board).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ q: "launch" }),
      { TODO: 20, IN_PROGRESS: 20, DONE: 20 },
      expect.any(AbortSignal), // lets a newer search cancel this request
    );
    expect(mockedTasksApi.list).not.toHaveBeenCalled();
  });

  it("'Load more' asks for more of that column only, still in one request", async () => {
    const many = Array.from({ length: 20 }, (_, i) => buildTask({ id: 100 + i, projectId: 10, title: `Task ${i}` }));
    mockedTasksApi.board.mockResolvedValue({
      columns: {
        TODO: { tasks: many, total: 25 },
        IN_PROGRESS: { tasks: [], total: 0 },
        DONE: { tasks: [], total: 0 },
      },
    });

    renderBoard("/projects/10");
    const todo = await screen.findByRole("region", { name: "To Do" });
    await userEvent.click(await within(todo).findByRole("button", { name: "Load more" }));

    await waitFor(() => expect(mockedTasksApi.board).toHaveBeenCalledTimes(2));
    expect(mockedTasksApi.board).toHaveBeenLastCalledWith(
      10,
      expect.anything(),
      { TODO: 40, IN_PROGRESS: 20, DONE: 20 },
      expect.any(AbortSignal),
    );
  });

  it("opens the task panel when the page is loaded from a task link", async () => {
    renderBoard("/projects/10/tasks/7");

    const dialog = await screen.findByRole("dialog", { name: "Edit task #7" });
    expect(within(dialog).getByDisplayValue("Write the launch post")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Copy link" })).toBeInTheDocument();
    expect(mockedTasksApi.get).toHaveBeenCalledWith(7, expect.any(AbortSignal));
  });

  it("closing a panel opened from a link goes to the plain board, keeping filters", async () => {
    renderBoard("/projects/10/tasks/7?priority=HIGH");

    const dialog = await screen.findByRole("dialog", { name: "Edit task #7" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/projects/10?priority=HIGH");
  });

  it("shows a clear message when the linked task doesn't exist", async () => {
    mockedTasksApi.get.mockRejectedValue(notFoundError());

    renderBoard("/projects/10/tasks/999");

    expect(await screen.findByText("Task #999 doesn't exist, or you don't have access to it.")).toBeInTheDocument();
  });

  it("clicking a task card puts its shareable link in the URL and opens the panel", async () => {
    renderBoard("/projects/10");

    await userEvent.click(await screen.findByRole("button", { name: "Write the launch post" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/projects/10/tasks/7");
    expect(await screen.findByRole("dialog", { name: "Edit task #7" })).toBeInTheDocument();

    // Opened from the board, so closing goes back to it.
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/projects\/10$/));
  });
});

