import { act, fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_FILTERS } from "../lib/boardFilters";
import { SEARCH_DEBOUNCE_MS, TaskFilters } from "./TaskFilters";

describe("TaskFilters search", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("waits until typing pauses before applying the search", () => {
    const onChange = jest.fn();
    render(<TaskFilters filters={DEFAULT_FILTERS} users={[]} onChange={onChange} />);
    const input = screen.getByRole("searchbox", { name: "Search" });

    fireEvent.change(input, { target: { value: "#4" } });
    act(() => jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50));
    fireEvent.change(input, { target: { value: "#42" } });
    act(() => jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50));
    expect(onChange).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(50));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, search: "#42" });
  });

  it("follows the search value from the URL, e.g. after clearing filters", () => {
    const { rerender } = render(
      <TaskFilters filters={{ ...DEFAULT_FILTERS, search: "release" }} users={[]} onChange={jest.fn()} />,
    );
    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveValue("release");

    rerender(<TaskFilters filters={DEFAULT_FILTERS} users={[]} onChange={jest.fn()} />);
    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveValue("");
  });
});

