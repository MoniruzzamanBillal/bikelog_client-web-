"use client";

import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import PageHeader from "@/components/shared/PageHeader/PageHeader";
import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import StateCard from "@/components/shared/StateCard/StateCard";
import { TablePagination } from "@/components/shared/table/TablePagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { Plus, Wrench } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TBike } from "../Bike/type/bike.types";
import { TMaintenanceType } from "../SettingsCatalog/type/maintenance-type.types";
import MaintenanceLogCard from "./MaintenanceLogCard";
import MaintenanceLogFormModal from "./MaintenanceLogFormModal";
import RemindersBanner from "./RemindersBanner";
import { TMaintenanceLog } from "./type/maintenance-log.types";

export default function MaintenanceLog() {
  const params = useParams();
  const bikeId = params.bikeId as string;

  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TMaintenanceLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<TMaintenanceLog | null>(null);
  const limit = 20;

  const { data, isLoading, isError, error, refetch } = useFetchData<{
    result: TMaintenanceLog[];
    meta: number;
  }>(
    ["maintenanceLogs", bikeId, page.toString()],
    `/bikes/${bikeId}/maintenance-logs?page=${page}&limit=${limit}&sort=-serviceDate`,
  );

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );

  const { mutateAsync: deleteMutation, isPending: isDeleting } = useDelete([
    ["maintenanceLogs", bikeId],
    ["reminders", bikeId],
    ["spending", bikeId],
  ]);

  const { data: mtData } = useFetchData<TMaintenanceType[]>(
    ["maintenanceTypes"],
    "/maintenance-types",
  );
  const maintenanceTypes = mtData?.data ?? [];

  const logs = data?.data?.result ?? [];
  const meta = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(meta / limit);

  const handleConfirmDelete = async () => {
    if (!deletingLog) return;
    try {
      const result = await deleteMutation({
        url: `/bikes/${bikeId}/maintenance-logs/${deletingLog._id}`,
      });
      if (result?.success) {
        toast.success("Maintenance log deleted");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete");
    } finally {
      setDeletingLog(null);
    }
  };

  const addButton = (label: string) => (
    <PrimaryButton onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      {label}
    </PrimaryButton>
  );

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title="Maintenance"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: bikeData?.data?.nickname ?? "Bike",
            href: `/bikes/${bikeId}`,
          },
          { label: "Maintenance Logs" },
        ]}
        description={
          !isLoading && meta > 0
            ? `${meta} service${meta === 1 ? "" : "s"} logged`
            : ""
        }
        actions={
          <>
            <span className="lg:hidden">{addButton("Add")}</span>
            <span className="hidden lg:inline-flex">
              {addButton("Add maintenance log")}
            </span>
          </>
        }
      />

      <RemindersBanner bikeId={bikeId} />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[150px] rounded-[10px]" />
          ))}
        </div>
      ) : isError ? (
        <StateCard
          variant="error"
          title="Couldn’t load maintenance logs"
          message={error?.message}
          onRetry={() => refetch()}
        />
      ) : logs.length === 0 ? (
        <StateCard
          icon={Wrench}
          title="No service history yet"
          message="Log a service with an interval (km) or a next due date and Bike Log will remind you when it’s due."
          action={addButton("Add maintenance log")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {logs.map((log: TMaintenanceLog) => (
            <MaintenanceLogCard
              key={log._id}
              log={log}
              maintenanceTypes={maintenanceTypes}
              onEdit={setEditingLog}
              onDelete={setDeletingLog}
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
        <MaintenanceLogFormModal
          open
          onClose={() => setCreateOpen(false)}
          bikeId={bikeId}
        />
      )}

      {editingLog && (
        <MaintenanceLogFormModal
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
        title="Delete maintenance log?"
        description="This service record will be permanently removed and cannot be undone."
        isLoading={isDeleting}
      />
    </div>
  );
}
