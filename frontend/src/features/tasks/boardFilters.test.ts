import { DEFAULT_FILTERS, filtersFromParams, filtersToParams, filtersToQuery } from "./boardFilters";

describe("boardFilters", () => {
  it("falls back to defaults for missing or invalid params", () => {
    expect(filtersFromParams(new URLSearchParams("priority=URGENT&sort=title"))).toEqual(DEFAULT_FILTERS);
  });

  it("round-trips filters through the URL", () => {
    const filters = { priority: "HIGH", assigneeId: "3", sort: "priority", direction: "desc" } as const;

    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
  });

  it("builds an API query without empty filters", () => {
    expect(filtersToQuery({ ...DEFAULT_FILTERS, assigneeId: "5" })).toEqual({
      priority: undefined,
      assigneeId: 5,
      sort: "dueDate",
      direction: "asc",
    });
  });
});
