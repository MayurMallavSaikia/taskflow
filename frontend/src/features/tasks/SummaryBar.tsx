import React from "react";
import type { ProjectSummary } from "../../api/types";
import { STATUS_LABELS, STATUSES } from "../../utils/taskLabels";

export const SummaryBar: React.FC<{ summary: ProjectSummary }> = ({ summary }) => (
  <dl className="summary-bar" aria-label="Project summary">
    <div className="summary-item">
      <dt>Total</dt>
      <dd>{summary.total}</dd>
    </div>
    {STATUSES.map((status) => (
      <div className="summary-item" key={status}>
        <dt>{STATUS_LABELS[status]}</dt>
        <dd>{summary.countsByStatus[status] ?? 0}</dd>
      </div>
    ))}
    <div className={`summary-item${summary.overdue > 0 ? " summary-item-overdue" : ""}`}>
      <dt>Overdue</dt>
      <dd>{summary.overdue}</dd>
    </div>
  </dl>
);
