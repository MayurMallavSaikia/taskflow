import { DEFAULT_FILTERS, filtersFromParams, filtersToParams, filtersToQuery } from "./boardFilters";

describe("boardFilters", () => {
  it("falls back to defaults for missing or invalid params", () => {
    expect(filtersFromParams(new URLSearchParams("priority=URGENT&sort=title"))).toEqual(DEFAULT_FILTERS);
  });

  it("round-trips filters through the URL", () => {
    const filters = { search: "#42", priority: "HIGH", assigneeId: "3", sort: "priority", direction: "desc" } as const;

    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
  });

  it("builds an API query without empty filters", () => {
    expect(filtersToQuery({ ...DEFAULT_FILTERS, assigneeId: "5" })).toEqual({
      q: undefined,
      priority: undefined,
      assigneeId: 5,
      sort: "dueDate",
      direction: "asc",
    });
  });

  it("trims the search term and ignores a blank one", () => {
    expect(filtersToQuery({ ...DEFAULT_FILTERS, search: "  release " }).q).toBe("release");
    expect(filtersToQuery({ ...DEFAULT_FILTERS, search: "   " }).q).toBeUndefined();
    expect(filtersToParams({ ...DEFAULT_FILTERS, search: "   " }).has("q")).toBe(false);
  });
});
