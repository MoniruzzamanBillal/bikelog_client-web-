"use client";

import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import PageHeader from "@/components/shared/PageHeader/PageHeader";
import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import StateCard from "@/components/shared/StateCard/StateCard";
import StatusTag from "@/components/shared/StatusTag/StatusTag";
import GenericTableComponent from "@/components/shared/table/GenericTableComponent";
import TableActionMenu from "@/components/shared/table/TableActionMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Fuel, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TBike } from "../Bike/type/bike.types";
import { TMileageHistoryResponse } from "../Mileage/type/mileage.types";
import { fuelLogColumns } from "./fuelLogColumns";
import FuelLogFormModal from "./FuelLogFormModal";
import FuelLogReceiptCell from "./FuelLogReceiptCell";
import { TFuelLog, TFuelLogsApiResponse } from "./type/fuel-log.types";

const money = (n: number) =>
  n?.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const FuelLog = () => {
  const params = useParams();
  const bikeId = params?.bikeId as string;

  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFuelLog, setEditingFuelLog] = useState<TFuelLog | null>(null);
  const [deletingFuelLog, setDeletingFuelLog] = useState<TFuelLog | null>(
    null,
  );
  const limit = 10;

  const {
    data: fuelLogsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useFetchData<TFuelLogsApiResponse>(
    ["fuelLogs", bikeId, page?.toString()],
    `/bikes/${bikeId}/fuel-logs?page=${page}&limit=${limit}&sort=-date`,
  );
  // same keys as the hub / mileage page — cached
  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );
  const { data: historyData } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
  );

  const { mutateAsync: deleteMutation, isPending: isDeleting } = useDelete([
    ["fuelLogs", bikeId],
    ["bikes", bikeId],
    ["mileage"],
    ["spending", bikeId],
  ]);

  // fuel log id → note about the closed mileage period that locks it
  const lockNotes = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of historyData?.data?.exactRecords ?? []) {
      const range = `${format(new Date(record?.periodStartDate), "d MMM")} → ${format(new Date(record?.periodEndDate), "d MMM")}`;
      for (const id of record?.fuelLogIds) {
        map?.set(
          id,
          `Locked — this fill is part of a closed mileage period (${range}).`,
        );
      }
    }
    return map;
  }, [historyData]);

  const getLockNote = (fuelLog: TFuelLog) => lockNotes?.get(fuelLog?._id);

  const handleConfirmDelete = async () => {
    if (!deletingFuelLog) return;
    try {
      const result = await deleteMutation({
        url: `/bikes/${bikeId}/fuel-logs/${deletingFuelLog?._id}`,
      });
      if (result?.success) {
        toast.success("Fuel log deleted successfully");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete fuel log");
    } finally {
      setDeletingFuelLog(null);
    }
  };

  const result = fuelLogsData?.data?.result ?? [];
  const meta = fuelLogsData?.data?.meta ?? 0;
  const totalPages = Math.ceil(meta / limit) || 1;
  const bike = bikeData?.data;

  const countLabel =
    !isLoading && meta > 0 ? `${meta} fill-up${meta === 1 ? "" : "s"}` : "";

  const addButton = (label: string) => (
    <PrimaryButton onClick={() => setIsCreateModalOpen(true)}>
      <Plus className="size-4" />
      {label}
    </PrimaryButton>
  );

  const emptyState = (
    <StateCard
      bare
      icon={Fuel}
      title="No fill-ups yet"
      message="Log every fill. Mark full-tank fills so Bike Log can close a mileage period and work out exact km/l."
      action={addButton("Add fuel log")}
    />
  );

  return (
    <div className="flex flex-col gap-3 lg:gap-5">
      <PageHeader
        title="Fuel logs"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: bike?.nickname ?? "Bike", href: `/bikes/${bikeId}` },
          { label: "Fuel Logs" },
        ]}
        description={countLabel}
        actions={
          <>
            <span className="lg:hidden">{addButton("Add")}</span>
            <span className="hidden lg:inline-flex">
              {addButton("Add fuel log")}
            </span>
          </>
        }
      />

      {isError ? (
        <StateCard
          variant="error"
          title="Couldn’t load fuel logs"
          message={error?.message}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {/* ── desktop table ── */}
          <div className="hidden lg:block">
            <GenericTableComponent
              data={result}
              columns={fuelLogColumns({
                onEdit: setEditingFuelLog,
                onDelete: setDeletingFuelLog,
                getLockNote,
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
                <Skeleton key={i} className="h-[84px] rounded-[10px]" />
              ))
            ) : result?.length === 0 ? (
              <div className="panel">{emptyState}</div>
            ) : (
              <>
                {result?.map((log) => {
                  const lockNote = getLockNote(log);
                  return (
                    <div key={log?._id} className="panel flex gap-3 py-3 pr-3 pl-3.5">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(log?.date), "dd MMM yyyy")}</span>
                          {log?.isFullTank ? (
                            <StatusTag tone="success">Full</StatusTag>
                          ) : (
                            <StatusTag>Partial</StatusTag>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2.5 tabular-nums">
                          <span className="text-lg font-medium">
                            ৳{money(log?.totalCost)}
                          </span>
                          <span className="truncate text-[13px] text-muted-foreground">
                            {log?.litersAdded?.toFixed(2)} L · ৳
                            {money(log?.pricePerLiter)}/L
                          </span>
                        </div>
                        <div className="truncate text-xs text-muted-foreground tabular-nums">
                          {log?.odometerReading?.toLocaleString()} km
                          {log?.fuelStation ? ` · ${log?.fuelStation}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <TableActionMenu
                          rowData={log}
                          onEdit={setEditingFuelLog}
                          onDelete={setDeletingFuelLog}
                          disabled={!!lockNote}
                          footnote={lockNote}
                        />
                        <FuelLogReceiptCell fuelLog={log} />
                      </div>
                    </div>
                  );
                })}

                {meta > limit && (
                  <div className="flex items-center justify-between px-0.5 py-1 text-[12.5px] text-muted-foreground tabular-nums">
                    <span>
                      {(page - 1) * limit + 1}–{Math.min(page * limit, meta)}{" "}
                      of {meta}
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
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
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
        <FuelLogFormModal
          open
          onClose={() => setIsCreateModalOpen(false)}
          bikeId={bikeId}
        />
      )}

      {editingFuelLog && (
        <FuelLogFormModal
          open
          onClose={() => setEditingFuelLog(null)}
          bikeId={bikeId}
          fuelLog={editingFuelLog}
        />
      )}

      <ConfirmDeleteModal
        open={!!deletingFuelLog}
        onClose={() => setDeletingFuelLog(null)}
        onConfirm={handleConfirmDelete}
        title="Delete fuel log?"
        description="This fill-up will be permanently removed and cannot be undone."
        isLoading={isDeleting}
      />
    </div>
  );
};

export default FuelLog;
