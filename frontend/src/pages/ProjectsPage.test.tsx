import { screen } from "@testing-library/react";
import React from "react";
import { projectsApi } from "@/entities/project/api/projectsApi";
import type { Project } from "@/entities/project";
import { alice, bob } from "@/test/fixtures";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ProjectsPage } from "./ProjectsPage";

jest.mock("@/entities/project/api/projectsApi", () => ({ projectsApi: { list: jest.fn() } }));

const mockedProjectsApi = projectsApi as jest.Mocked<typeof projectsApi>;

const own: Project = { id: 1, name: "Website Relaunch", description: null, owner: alice, createdAt: "2026-11-20T10:00:00Z" };
const shared: Project = { id: 2, name: "Mobile App", description: "Companion app", owner: bob, createdAt: "2026-11-21T10:00:00Z" };

describe("ProjectsPage", () => {
  afterEach(() => jest.resetAllMocks());

  // StrictMode mounts, unmounts and remounts: the page must still end up with its projects
  // (regression: the first fetch was aborted and the second one skipped, leaving a spinner).
  it("loads projects under React StrictMode", async () => {
    mockedProjectsApi.list.mockResolvedValue([own, shared]);

    renderWithProviders(
      <React.StrictMode>
        <ProjectsPage />
      </React.StrictMode>,
    );

    expect(await screen.findByText("Website Relaunch")).toBeInTheDocument();
    expect(screen.getByText("Mobile App")).toBeInTheDocument();
    expect(screen.queryByText("Loading projects…")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no projects", async () => {
    mockedProjectsApi.list.mockResolvedValue([]);

    renderWithProviders(<ProjectsPage />);

    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
  });
});

