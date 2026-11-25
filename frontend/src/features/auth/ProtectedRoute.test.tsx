import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../test/renderWithProviders";
import { tokenStorage } from "../../utils/tokenStorage";
import { ProtectedRoute } from "./ProtectedRoute";

function renderRoutes() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>Login page</p>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/projects" element={<p>Projects page</p>} />
      </Route>
    </Routes>,
    { route: "/projects" },
  );
}

describe("ProtectedRoute", () => {
  afterEach(() => localStorage.clear());

  it("redirects logged-out users to the login page", () => {
    renderRoutes();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects when the stored token has already expired", () => {
    tokenStorage.save({
      token: "old",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      user: { id: 1, name: "Alice", email: "alice@example.com" },
    });

    renderRoutes();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders the page for logged-in users", () => {
    tokenStorage.save({
      token: "valid",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { id: 1, name: "Alice", email: "alice@example.com" },
    });

    renderRoutes();

    expect(screen.getByText("Projects page")).toBeInTheDocument();
  });
});
