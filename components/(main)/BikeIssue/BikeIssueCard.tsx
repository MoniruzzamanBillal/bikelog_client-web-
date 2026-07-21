"use client";

import { CheckCircle2, RotateCcw, SquarePen, Trash2 } from "lucide-react";
import { TBikeIssue, TBikeIssueStatus } from "./type/bike-issue.types";

type TProps = {
  issue: TBikeIssue;
  onEdit: (issue: TBikeIssue) => void;
  onDelete: (issue: TBikeIssue) => void;
  onToggleStatus: (issue: TBikeIssue, nextStatus: TBikeIssueStatus) => void;
};

const ISSUE_STATUS_BADGE: Record<TBikeIssueStatus, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  resolved:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function BikeIssueCard({
  issue,
  onEdit,
  onDelete,
  onToggleStatus,
}: TProps) {
  const isOpen = issue.status === "open";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{issue.title}</p>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ISSUE_STATUS_BADGE[issue.status]}`}
            >
              {issue.status === "open" ? "Open" : "Resolved"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(issue.dateReported).toLocaleDateString()}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(issue)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <SquarePen className="size-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              onToggleStatus(issue, isOpen ? "resolved" : "open")
            }
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            title={isOpen ? "Mark Resolved" : "Reopen"}
          >
            {isOpen ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <RotateCcw className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(issue)}
            className="rounded p-1 text-muted-foreground hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {issue.description && (
        <p className="mt-2 text-xs text-muted-foreground">
          {issue.description}
        </p>
      )}
    </div>
  );
}
