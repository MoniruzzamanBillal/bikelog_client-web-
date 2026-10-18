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
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, CopyPlus, Droplet, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TBike } from "../Bike/type/bike.types";
import EngineOilLogFormModal, {
  TEngineOilLogSeed,
} from "./EngineOilLogFormModal";
import EngineOilReceiptCell from "./EngineOilReceiptCell";
import EngineOilRowActions from "./EngineOilRowActions";
import EngineOilStatusCard from "./EngineOilStatusCard";
import { engineOilLogColumns } from "./engineOilLogColumns";
import {
  getOilName,
  TEngineOilLog,
  TEngineOilLogsApiResponse,
  TEngineOilStatus,
} from "./type/engine-oil-log.types";

const money = (n: number) =>
  n?.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const EngineOilLog = () => {
  const { bikeId } = useParams<{ bikeId: string }>();

  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [seed, setSeed] = useState<TEngineOilLogSeed | undefined>();
  const [editingLog, setEditingLog] = useState<TEngineOilLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<TEngineOilLog | null>(null);
  const limit = 10;

  const {
    data: logsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useFetchData<TEngineOilLogsApiResponse>(
    ["engineOilLogs", bikeId, page?.toString()],
    `/bikes/${bikeId}/engine-oil-logs?page=${page}&limit=${limit}&sort=-changeDate`,
  );

  // ! H-W5: the forecast comes from its own endpoint and its own query key, never from the
  // ! paginated list — the list keys on `page`, so on page 2 `result` is months-old logs
  // ! and the card would change as the rider pages through history.
  const { data: statusData, isLoading: isStatusLoading } =
    useFetchData<TEngineOilStatus>(
      ["engineOilStatus", bikeId],
      `/bikes/${bikeId}/engine-oil-logs/status`,
    );

  // ! §H: a dedicated one-row query, so "Same as last change" behaves identically on
  // ! page 1 and page 7. `["engineOilLogs", bikeId]` is a prefix of this key, so it
  // ! refreshes with the list and never offers the change before last.
  const { data: latestData } = useFetchData<TEngineOilLogsApiResponse>(
    ["engineOilLogs", bikeId, "latest"],
    `/bikes/${bikeId}/engine-oil-logs?limit=1&sort=-changeDate`,
  );

  // same key as the hub — served from cache
  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );

  const { mutateAsync: deleteMutation, isPending: isDeleting } = useDelete([
    ["engineOilLogs", bikeId],
    ["engineOilStatus", bikeId],
    ["bikes", bikeId],
    ["spending", bikeId],
    ["reminders", bikeId],
  ]);

  const handleConfirmDelete = async () => {
    if (!deletingLog) return;
    try {
      const result = await deleteMutation({
        url: `/bikes/${bikeId}/engine-oil-logs/${deletingLog?._id}`,
      });
      if (result?.success) {
        toast.success("Engine oil log deleted successfully");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete engine oil log");
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

  const countLabel =
    !isLoading && meta > 0 ? `${meta} change${meta === 1 ? "" : "s"}` : "";

  const openCreate = (withSeed?: TEngineOilLogSeed) => {
    setSeed(withSeed);
    setIsCreateModalOpen(true);
  };

  const addButton = (label: string) => (
    <PrimaryButton onClick={() => openCreate()}>
      <Plus className="size-4" />
      {label}
    </PrimaryButton>
  );

  // ! §H / H-W11: carries what repeats and never the odometer or the date
  const sameAsLastButton = (label: string) =>
    latest ? (
      <Button
        variant="outline"
        className="h-10"
        onClick={() =>
          openCreate({
            oilType:
              latest?.oilType && typeof latest?.oilType === "object"
                ? latest?.oilType?._id
                : ((latest?.oilType as string | null) ?? ""),
            intervalKmUsed: latest?.intervalKmUsed?.toString() ?? "",
            quantityLiters: latest?.quantityLiters?.toString() ?? "",
            oilFilterChanged: !!latest?.oilFilterChanged,
            serviceCenter: latest?.serviceCenter ?? "",
            cost: latest?.cost?.toString() ?? "",
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
      icon={Droplet}
      title="No oil changes yet"
      message="Log every oil change with the interval you used, and Bike Log works out how far you've run on the current oil and when the next change is due."
      action={addButton("Log oil change")}
    />
  );

  return (
    <div className="flex flex-col gap-3 lg:gap-5">
      <PageHeader
        title="Engine oil"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: bike?.nickname ?? "Bike", href: `/bikes/${bikeId}` },
          { label: "Engine oil" },
        ]}
        description={countLabel}
        actions={
          <>
            <span className="lg:hidden">{sameAsLastButton("Same as last")}</span>
            <span className="hidden lg:inline-flex">
              {sameAsLastButton("Same as last change")}
            </span>
            <span className="lg:hidden">{addButton("Add")}</span>
            <span className="hidden lg:inline-flex">
              {addButton("Log oil change")}
            </span>
          </>
        }
      />

      <EngineOilStatusCard
        status={status}
        isLoading={isStatusLoading}
        addButton={addButton("Log oil change")}
      />

      {isError ? (
        <StateCard
          variant="error"
          title="Couldn’t load oil changes"
          message={error?.message}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {/* ── desktop table ── */}
          <div className="hidden lg:block">
            <GenericTableComponent
              data={result}
              columns={engineOilLogColumns({
                onEdit: setEditingLog,
                onDelete: setDeletingLog,
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
                {result?.map((log) => (
                  <div
                    key={log?._id}
                    className="panel flex gap-3 py-3 pr-3 pl-3.5"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(log?.changeDate), "dd MMM yyyy")}
                        </span>
                        {log?.oilFilterChanged ? (
                          <StatusTag tone="success">Filter</StatusTag>
                        ) : null}
                      </div>
                      <div className="flex items-baseline gap-2.5 tabular-nums">
                        <span className="text-lg font-medium">
                          ৳{money(log?.cost)}
                        </span>
                        <span className="truncate text-[13px] text-muted-foreground">
                          {getOilName(log?.oilType, "—")}
                          {log?.quantityLiters != null
                            ? ` · ${log?.quantityLiters} L`
                            : ""}
                        </span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground tabular-nums">
                        {log?.odometerReading?.toLocaleString()} km
                        {log?.costPerKm != null
                          ? ` · ৳${money(log?.costPerKm)}/km`
                          : ""}
                        {log?.serviceCenter ? ` · ${log?.serviceCenter}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between gap-1">
                      {/* ! same icons as the desktop column, so one page has one
                          ! interaction rather than a dropdown on one half of it */}
                      <EngineOilRowActions
                        log={log}
                        onEdit={setEditingLog}
                        onDelete={setDeletingLog}
                      />
                      <EngineOilReceiptCell log={log} />
                    </div>
                  </div>
                ))}

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
        <EngineOilLogFormModal
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
        <EngineOilLogFormModal
          open
          onClose={() => setEditingLog(null)}
          bikeId={bikeId}
          log={editingLog}
        />
      )}

      <ConfirmDeleteModal
        open={!!deletingLog}
        onClose={() => setDeletingLog(null)}
        onConfirm={handleConfirmDelete}
        title="Delete oil change?"
        description="This oil change will be permanently removed and cannot be undone."
        isLoading={isDeleting}
      />
    </div>
  );
};

export default EngineOilLog;
