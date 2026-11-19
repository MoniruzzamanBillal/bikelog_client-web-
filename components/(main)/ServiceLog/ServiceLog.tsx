"use client";

import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import PageHeader from "@/components/shared/PageHeader/PageHeader";
import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import StateCard from "@/components/shared/StateCard/StateCard";
import StatusTag from "@/components/shared/StatusTag/StatusTag";
import GenericTableComponent from "@/components/shared/table/GenericTableComponent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { differenceInCalendarDays, format, parse } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CopyPlus,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TBike } from "../Bike/type/bike.types";
import ServiceDetailModal from "./ServiceDetailModal";
import ServiceLogFormModal, { TServiceSeed } from "./ServiceLogFormModal";
import ServiceRowActions from "./ServiceRowActions";
import ServiceStatusCard from "./ServiceStatusCard";
import { serviceLogColumns } from "./serviceLogColumns";
import {
  itemsTotal,
  TServiceLog,
  TServiceLogsApiResponse,
  TServiceStatus,
} from "./type/service-log.types";

const money = (n: number) =>
  n?.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });

const fmt = (s: string | null | undefined, pattern: string): string => {
  if (!s) return "";
  const d = parse(s.slice(0, 10), "yyyy-MM-dd", new Date());
  return Number.isNaN(d.getTime()) ? "" : format(d, pattern);
};

const upcomingLine = (log: TServiceLog): string => {
  if (!log?.dueDate) return "upcoming";
  const days = differenceInCalendarDays(
    parse(log.dueDate.slice(0, 10), "yyyy-MM-dd", new Date()),
    new Date(),
  );
  if (days < 0)
    return `overdue · ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past due`;
  if (days === 0) return "upcoming · due today";
  return `upcoming · in ${days} day${days === 1 ? "" : "s"}`;
};

const ServiceLog = () => {
  const { bikeId } = useParams<{ bikeId: string }>();

  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [seed, setSeed] = useState<TServiceSeed | undefined>();
  const [editingLog, setEditingLog] = useState<TServiceLog | null>(null);
  const [completingLog, setCompletingLog] = useState<TServiceLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<TServiceLog | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const limit = 10;

  const {
    data: logsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useFetchData<TServiceLogsApiResponse>(
    ["serviceLogs", bikeId, page?.toString()],
    `/bikes/${bikeId}/service-logs?page=${page}&limit=${limit}&sort=-serviceDate`,
  );

  // H-W-SVC-5: warranty status from its own endpoint/key, never the paginated list.
  const { data: statusData, isLoading: isStatusLoading } =
    useFetchData<TServiceStatus>(
      ["serviceStatus", bikeId],
      `/bikes/${bikeId}/service-logs/status`,
    );

  // §H quick-fill source — one-row query, behaves the same on page 1 and page 7.
  const { data: latestData } = useFetchData<TServiceLogsApiResponse>(
    ["serviceLogs", bikeId, "latest"],
    `/bikes/${bikeId}/service-logs?limit=1&sort=-serviceDate`,
  );

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );

  const { mutateAsync: deleteMutation, isPending: isDeleting } = useDelete([
    ["serviceLogs", bikeId],
    ["serviceStatus", bikeId],
    ["bikes", bikeId],
    ["spending", bikeId],
    ["reminders", bikeId],
  ]);

  const handleConfirmDelete = async () => {
    if (!deletingLog) return;
    try {
      const result = await deleteMutation({
        url: `/bikes/${bikeId}/service-logs/${deletingLog?._id}`,
      });
      if (result?.success) toast.success("Service deleted successfully");
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete service");
    } finally {
      setDeletingLog(null);
    }
  };

  const result = logsData?.data?.result ?? [];
  const meta = logsData?.data?.meta ?? 0;
  const totalPages = Math.ceil(meta / limit) || 1;
  const bike = bikeData?.data;
  const status = statusData?.data;
  const latest = latestData?.data?.result?.[0];
  const detailLog = result.find((r) => r?._id === detailId) ?? null;

  const countLabel =
    !isLoading && meta > 0 ? `${meta} service${meta === 1 ? "" : "s"}` : "";

  const openCreate = (withSeed?: TServiceSeed) => {
    setSeed(withSeed);
    setIsCreateModalOpen(true);
  };

  const addButton = (label: string) => (
    <PrimaryButton onClick={() => openCreate()}>
      <Plus className="size-4" />
      {label}
    </PrimaryButton>
  );

  const sameAsLastButton = (label: string) =>
    latest ? (
      <Button
        variant="outline"
        className="h-10"
        onClick={() =>
          openCreate({
            serviceKind: latest?.serviceKind ?? "regular",
            serviceCenter: latest?.serviceCenter ?? "",
            centerType: latest?.centerType ?? "",
          })
        }
      >
        <CopyPlus className="size-4" />
        {label}
      </Button>
    ) : null;

  const emptyState = (
    <StateCard
      bare
      icon={ShieldCheck}
      title="No services yet"
      message="Log a workshop visit to track your warranty services, line-item costs and the technician's recommendations."
      action={addButton("Add service")}
    />
  );

  return (
    <div className="flex flex-col gap-3 lg:gap-5">
      <PageHeader
        title="Service"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: bike?.nickname ?? "Bike", href: `/bikes/${bikeId}` },
          { label: "Service" },
        ]}
        description={countLabel}
        actions={
          <>
            <span className="lg:hidden">{sameAsLastButton("Same as last")}</span>
            <span className="hidden lg:inline-flex">
              {sameAsLastButton("Same as last")}
            </span>
            <span className="lg:hidden">{addButton("Add")}</span>
            <span className="hidden lg:inline-flex">
              {addButton("Add service")}
            </span>
          </>
        }
      />

      <ServiceStatusCard status={status} isLoading={isStatusLoading} />

      {isError ? (
        <StateCard
          variant="error"
          title="Couldn’t load services"
          message={error?.message}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {/* ── desktop table ── */}
          <div className="hidden lg:block">
            <GenericTableComponent
              data={result}
              columns={serviceLogColumns({
                onDetails: (l) => setDetailId(l?._id),
                onEdit: setEditingLog,
                onDelete: setDeletingLog,
                onComplete: setCompletingLog,
              })}
              isLoading={isLoading}
              emptyState={emptyState}
              totalItems={meta}
              totalPages={totalPages}
              currentPage={page - 1}
              onPageChange={(p) => setPage(p + 1)}
              itemsPerPage={limit}
              showToolbar={false}
              showSerialNumber={true}
            />
          </div>

          {/* ── mobile card rows ── */}
          <div className="flex flex-col gap-2.5 lg:hidden">
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-[92px] rounded-[10px]" />
              ))
            ) : result?.length === 0 ? (
              <div className="panel">{emptyState}</div>
            ) : (
              <>
                {result?.map((log) => {
                  const isCompleted = log?.serviceDate != null;
                  const items = (log?.items ?? []).filter((i) => i?.name);
                  return (
                    <div
                      key={log?._id}
                      className="panel flex gap-3 py-3 pr-3 pl-3.5"
                    >
                      <button
                        type="button"
                        disabled={!isCompleted}
                        onClick={() => isCompleted && setDetailId(log?._id)}
                        className="flex min-w-0 flex-1 flex-col gap-1 text-left disabled:cursor-default"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {isCompleted
                              ? fmt(log?.serviceDate, "dd MMM yyyy")
                              : `Scheduled ~ ${fmt(log?.dueDate, "d MMM")}`}
                          </span>
                          {log?.serviceKind === "warranty" ? (
                            <StatusTag tone="accent">
                              Warranty #{log?.warrantyNumber ?? "—"}
                            </StatusTag>
                          ) : (
                            <StatusTag>Regular</StatusTag>
                          )}
                          {log?.centerType ? (
                            <StatusTag>{log?.centerType}</StatusTag>
                          ) : null}
                        </div>

                        {isCompleted ? (
                          <div className="flex items-baseline gap-2.5 tabular-nums">
                            <span className="text-lg font-medium">
                              {items.length > 0
                                ? `৳${money(itemsTotal(items))}`
                                : "Free service"}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[13px] text-muted-foreground">
                            {upcomingLine(log)}
                          </div>
                        )}

                        <div className="truncate text-xs text-muted-foreground tabular-nums">
                          {isCompleted && log?.odometerReading != null
                            ? `${log?.odometerReading?.toLocaleString()} km`
                            : ""}
                          {log?.serviceCenter
                            ? `${isCompleted && log?.odometerReading != null ? " · " : ""}${log?.serviceCenter}`
                            : ""}
                        </div>
                      </button>

                      <div className="flex flex-col items-end justify-between gap-1">
                        <ServiceRowActions
                          log={log}
                          onDetails={(l) => setDetailId(l?._id)}
                          onEdit={setEditingLog}
                          onDelete={setDeletingLog}
                          onComplete={setCompletingLog}
                        />
                        {!isCompleted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCompletingLog(log)}
                          >
                            Mark completed
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {meta > limit && (
                  <div className="flex items-center justify-between px-0.5 py-1 text-[12.5px] text-muted-foreground tabular-nums">
                    <span>
                      {(page - 1) * limit + 1}–{Math.min(page * limit, meta)} of{" "}
                      {meta}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="grid size-10 place-items-center rounded-lg text-foreground shadow-sm disabled:opacity-45"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <span className="px-1.5 text-foreground">
                        {page} / {totalPages}
                      </span>
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="grid size-10 place-items-center rounded-lg text-foreground shadow-sm disabled:opacity-45"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {isCreateModalOpen && (
        <ServiceLogFormModal
          open
          onClose={() => {
            setIsCreateModalOpen(false);
            setSeed(undefined);
          }}
          bikeId={bikeId}
          seed={seed}
        />
      )}

      {editingLog && (
        <ServiceLogFormModal
          open
          onClose={() => setEditingLog(null)}
          bikeId={bikeId}
          log={editingLog}
        />
      )}

      {completingLog && (
        <ServiceLogFormModal
          open
          onClose={() => setCompletingLog(null)}
          bikeId={bikeId}
          log={completingLog}
          startCompleted
        />
      )}

      {detailLog && (
        <ServiceDetailModal
          open={!!detailLog}
          onClose={() => setDetailId(null)}
          bikeId={bikeId}
          log={detailLog}
        />
      )}

      <ConfirmDeleteModal
        open={!!deletingLog}
        onClose={() => setDeletingLog(null)}
        onConfirm={handleConfirmDelete}
        title="Delete service?"
        description="This service log will be permanently removed and cannot be undone."
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ServiceLog;
