import { render } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { setupStore, type AppStore, type RootState } from "@/app/store";

interface Options {
  route?: string;
  preloadedState?: Partial<RootState>;
  store?: AppStore;
}

/**
 * Renders with a fresh, real Redux store (each test is isolated) and a router. Tests mock only
 * the API modules, so slices, thunks and selectors run for real. The auth slice reads the saved
 * session when the store is created, so save one first (sessionStorage.save) to render as logged in.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { route = "/", preloadedState, store = setupStore(preloadedState) }: Options = {},
) {
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {ui}
        </MemoryRouter>
      </Provider>,
    ),
  };
}

