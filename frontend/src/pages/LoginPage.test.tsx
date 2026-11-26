import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { authApi } from "@/features/auth/api/authApi";
import { sessionStorage } from "@/features/auth";
import { renderWithProviders } from "@/test/renderWithProviders";
import { LoginPage } from "./LoginPage";

jest.mock("@/features/auth/api/authApi", () => ({
  authApi: { login: jest.fn(), register: jest.fn(), guest: jest.fn() },
}));

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

function renderLogin() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/projects" element={<p>Projects page</p>} />
    </Routes>,
    { route: "/login" },
  );
}

describe("LoginPage guest login", () => {
  afterEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it("signs in as a guest and opens the projects page", async () => {
    mockedAuthApi.guest.mockResolvedValue({
      token: "guest-token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 42, name: "Demo User", email: "demo@taskflow.dev" },
    });

    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: "Continue as guest" }));

    expect(await screen.findByText("Projects page")).toBeInTheDocument();
    expect(mockedAuthApi.login).not.toHaveBeenCalled();
    expect(sessionStorage.load()?.user.email).toBe("demo@taskflow.dev");
  });

  it("shows an error when guest login fails", async () => {
    mockedAuthApi.guest.mockRejectedValue(new Error("Network down"));

    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: "Continue as guest" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText("Projects page")).not.toBeInTheDocument();
  });
});

