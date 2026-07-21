"use client";

import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDelete, useFetchData, usePatch } from "@/hooks/useApi";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import BikeIssueCard from "./BikeIssueCard";
import BikeIssueFormModal from "./BikeIssueFormModal";
import {
  TBikeIssue,
  TBikeIssueStatus,
  TBikeIssuesApiResponse,
} from "./type/bike-issue.types";

type TStatusFilter = "all" | TBikeIssueStatus;

export default function BikeIssue() {
  const params = useParams();
  const bikeId = params.bikeId as string;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<TBikeIssue | null>(null);
  const limit = 20;

  const { data, isLoading } = useFetchData<TBikeIssuesApiResponse>(
    ["bikeIssues", bikeId, page.toString(), statusFilter],
    `/bikes/${bikeId}/issues?page=${page}&limit=${limit}&sort=-dateReported${
      statusFilter !== "all" ? `&status=${statusFilter}` : ""
    }`,
  );

  const { mutateAsync: deleteMutation } = useDelete([["bikeIssues", bikeId]]);

  const { mutateAsync: toggleStatusMutation } = usePatch([
    ["bikeIssues", bikeId],
  ]);

  const issues = data?.data?.result ?? [];

  const handleEdit = (issue: TBikeIssue) => setEditingIssue(issue);

  const handleStatusFilterChange = (value: TStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleDelete = async (issue: TBikeIssue) => {
    if (!confirm("Delete this issue?")) return;
    try {
      const result = await deleteMutation({
        url: `/bikes/${bikeId}/issues/${issue._id}`,
      });
      if (result?.success) {
        toast.success("Issue deleted");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete");
    }
  };

  const handleToggleStatus = async (
    issue: TBikeIssue,
    nextStatus: TBikeIssueStatus,
  ) => {
    try {
      const result = await toggleStatusMutation({
        url: `/bikes/${bikeId}/issues/${issue._id}/status`,
        payload: { status: nextStatus },
      });
      if (result?.success) {
        toast.success(
          nextStatus === "resolved" ? "Marked as resolved" : "Reopened",
        );
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to update status");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Issues</h1>
        <PrimaryButton onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 size-4" />
          Add
        </PrimaryButton>
      </div>

      <Select
        value={statusFilter}
        onValueChange={(value) =>
          handleStatusFilterChange(value as TStatusFilter)
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues yet.</p>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <BikeIssueCard
              key={issue._id}
              issue={issue}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      <BikeIssueFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        bikeId={bikeId}
      />

      {editingIssue && (
        <BikeIssueFormModal
          open
          onClose={() => setEditingIssue(null)}
          bikeId={bikeId}
          issue={editingIssue}
        />
      )}
    </div>
  );
}
