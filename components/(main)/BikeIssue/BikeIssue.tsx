"use client";
import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import PageHeader from "@/components/shared/PageHeader/PageHeader";
import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import SegmentedTabs from "@/components/shared/SegmentedTabs/SegmentedTabs";
import StateCard from "@/components/shared/StateCard/StateCard";
import { TablePagination } from "@/components/shared/table/TablePagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useDelete, useFetchData, usePatch } from "@/hooks/useApi";
import { AlertTriangle, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TBike } from "../Bike/type/bike.types";
import BikeIssueCard from "./BikeIssueCard";
import BikeIssueFormModal from "./BikeIssueFormModal";
import {
  TBikeIssue,
  TBikeIssueStatus,
  TBikeIssuesApiResponse,
} from "./type/bike-issue.types";

type TStatusFilter = "all" | TBikeIssueStatus;

const statusOptions: { value: TStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
];

export default function BikeIssue() {
  const params = useParams();
  const bikeId = params?.bikeId as string;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<TBikeIssue | null>(null);
  const [deletingIssue, setDeletingIssue] = useState<TBikeIssue | null>(null);
  const limit = 20;

  const { data, isLoading, isError, error, refetch } =
    useFetchData<TBikeIssuesApiResponse>(
      ["bikeIssues", bikeId, page?.toString(), statusFilter],
      `/bikes/${bikeId}/issues?page=${page}&limit=${limit}&sort=-dateReported${
        statusFilter !== "all" ? `&status=${statusFilter}` : ""
      }`,
    );

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );

  const { mutateAsync: deleteMutation, isPending: isDeleting } = useDelete([
    ["bikeIssues", bikeId],
  ]);

  const { mutateAsync: toggleStatusMutation } = usePatch([
    ["bikeIssues", bikeId],
  ]);

  const issues = data?.data?.result ?? [];
  const meta = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(meta / limit);

  const handleStatusFilterChange = (value: TStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deletingIssue) return;
    try {
      const result = await deleteMutation({
        url: `/bikes/${bikeId}/issues/${deletingIssue?._id}`,
      });
      if (result?.success) {
        toast.success("Issue deleted");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete");
    } finally {
      setDeletingIssue(null);
    }
  };

  const handleToggleStatus = async (
    issue: TBikeIssue,
    nextStatus: TBikeIssueStatus,
  ) => {
    try {
      const result = await toggleStatusMutation({
        url: `/bikes/${bikeId}/issues/${issue?._id}/status`,
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

  // open/resolved split is exact when the whole list fits on one page
  const openCount = issues?.filter((i) => i?.status === "open")?.length;
  const subtitle =
    isLoading || meta === 0
      ? ""
      : statusFilter === "all" && totalPages <= 1
        ? `${openCount} open · ${issues?.length - openCount} resolved`
        : `${meta} issue${meta === 1 ? "" : "s"}`;

  const addButton = (label: string) => (
    <PrimaryButton onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      {label}
    </PrimaryButton>
  );

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title="Issues"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: bikeData?.data?.nickname ?? "Bike",
            href: `/bikes/${bikeId}`,
          },
          { label: "Issues" },
        ]}
        description={subtitle}
        actions={
          <>
            <span className="lg:hidden">{addButton("Add")}</span>
            <span className="hidden lg:inline-flex">
              {addButton("Report issue")}
            </span>
          </>
        }
      />

      <SegmentedTabs
        value={statusFilter}
        onChange={handleStatusFilterChange}
        options={statusOptions}
        className="self-start"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[132px] rounded-[10px]" />
          ))}
        </div>
      ) : isError ? (
        <StateCard
          variant="error"
          title="Couldn’t load issues"
          message={error?.message}
          onRetry={() => refetch()}
        />
      ) : issues?.length === 0 ? (
        <StateCard
          icon={AlertTriangle}
          title={
            statusFilter === "all" ? "No issues reported" : `No ${statusFilter} issues`
          }
          message="Note down rattles, leaks or warning lights with photos so you can show the mechanic."
          action={statusFilter === "all" ? addButton("Report issue") : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {issues?.map((issue) => (
            <BikeIssueCard
              key={issue?._id}
              issue={issue}
              onEdit={setEditingIssue}
              onDelete={setDeletingIssue}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={meta}
          itemsPerPage={limit}
          onPageChange={setPage}
          className="panel border-t-0"
        />
      )}

      {createOpen && (
        <BikeIssueFormModal
          open
          onClose={() => setCreateOpen(false)}
          bikeId={bikeId}
        />
      )}

      {editingIssue && (
        <BikeIssueFormModal
          open
          onClose={() => setEditingIssue(null)}
          bikeId={bikeId}
          issue={editingIssue}
        />
      )}

      <ConfirmDeleteModal
        open={!!deletingIssue}
        onClose={() => setDeletingIssue(null)}
        onConfirm={handleConfirmDelete}
        title="Delete issue?"
        description="This issue and its photos will be permanently removed."
        isLoading={isDeleting}
      />
    </div>
  );
}
