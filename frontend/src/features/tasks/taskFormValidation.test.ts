import { validateTaskForm, type TaskFormValues } from "./taskFormValidation";

const base: TaskFormValues = {
  title: "Task",
  description: "",
  status: "TODO",
  priority: "MEDIUM",
  dueDate: "",
  assigneeId: "",
};

describe("validateTaskForm", () => {
  it("accepts a valid form", () => {
    expect(validateTaskForm(base, "2026-03-10")).toEqual({});
  });

  it("limits the title to 120 characters", () => {
    expect(validateTaskForm({ ...base, title: "x".repeat(121) }, "2026-03-10").title).toMatch(/at most 120/);
  });

  it("allows keeping an existing past due date when editing", () => {
    expect(validateTaskForm({ ...base, dueDate: "2026-01-01" }, "2026-03-10", "2026-01-01")).toEqual({});
  });

  it("rejects changing to a past due date", () => {
    expect(validateTaskForm({ ...base, dueDate: "2026-01-02" }, "2026-03-10", "2026-01-01").dueDate).toBeDefined();
  });
});
