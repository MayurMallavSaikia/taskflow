import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { projectsApi } from "@/entities/project/api/projectsApi";
import { selectTaskRevision } from "@/entities/task";
import { usersApi } from "@/entities/user/api/usersApi";
import { alice, bob } from "@/test/fixtures";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ProjectMembers } from "./ProjectMembers";

jest.mock("@/entities/project/api/projectsApi", () => ({
  projectsApi: { members: jest.fn(), addMember: jest.fn(), removeMember: jest.fn() },
}));
jest.mock("@/entities/user/api/usersApi", () => ({ usersApi: { list: jest.fn() } }));

const mockedProjectsApi = projectsApi as jest.Mocked<typeof projectsApi>;
const mockedUsersApi = usersApi as jest.Mocked<typeof usersApi>;

describe("ProjectMembers", () => {
  beforeEach(() => {
    mockedUsersApi.list.mockResolvedValue([alice, bob]);
  });

  afterEach(() => jest.resetAllMocks());

  it("is read-only for members who aren't the owner", async () => {
    mockedProjectsApi.members.mockResolvedValue([alice, bob]);

    renderWithProviders(<ProjectMembers projectId={10} owner={alice} currentUserId={bob.id} />);

    expect(await screen.findByRole("list", { name: "Project members" })).toBeInTheDocument();
    expect(screen.getByText(/Only the owner \(Alice\) can add or remove members/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Add member")).not.toBeInTheDocument();
    expect(mockedUsersApi.list).not.toHaveBeenCalled(); // no need to load everyone
  });

  it("lists members, marks the owner and can't remove them", async () => {
    mockedProjectsApi.members.mockResolvedValue([alice, bob]);

    renderWithProviders(<ProjectMembers projectId={10} owner={alice} currentUserId={alice.id} />);

    const list = await screen.findByRole("list", { name: "Project members" });
    expect(within(list).getByText("Owner")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Alice" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Bob" })).toBeInTheDocument();
  });

  it("only offers non-members and adds the chosen user", async () => {
    mockedProjectsApi.members.mockResolvedValue([alice]);
    mockedProjectsApi.addMember.mockResolvedValue([alice, bob]);

    renderWithProviders(<ProjectMembers projectId={10} owner={alice} currentUserId={alice.id} />);

    const select = await screen.findByLabelText("Add member");
    await waitFor(() => expect(within(select).getByRole("option", { name: /Bob/ })).toBeInTheDocument());
    expect(within(select).queryByRole("option", { name: /Alice/ })).not.toBeInTheDocument();

    await userEvent.selectOptions(select, String(bob.id));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(mockedProjectsApi.addMember).toHaveBeenCalledWith(10, bob.id);
    expect(await screen.findByRole("button", { name: "Remove Bob" })).toBeInTheDocument();
  });

  it("removes a member after confirmation and refreshes the project's tasks", async () => {
    mockedProjectsApi.members.mockResolvedValue([alice, bob]);
    mockedProjectsApi.removeMember.mockResolvedValue([alice]);
    jest.spyOn(window, "confirm").mockReturnValue(true);

    const { store } = renderWithProviders(<ProjectMembers projectId={10} owner={alice} currentUserId={alice.id} />);
    await userEvent.click(await screen.findByRole("button", { name: "Remove Bob" }));

    expect(mockedProjectsApi.removeMember).toHaveBeenCalledWith(10, bob.id);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Remove Bob" })).not.toBeInTheDocument());
    // Bob's tasks were unassigned on the server, so the board must refetch.
    expect(selectTaskRevision(10)(store.getState())).toBe(1);
  });
});

