"use client";

import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import { TablePagination } from "@/components/shared/table/TablePagination";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import MaintenanceLogCard from "./MaintenanceLogCard";
import MaintenanceLogFormModal from "./MaintenanceLogFormModal";
import RemindersBanner from "./RemindersBanner";
import { TMaintenanceLog } from "./type/maintenance-log.types";
import { TMaintenanceType } from "../SettingsCatalog/type/maintenance-type.types";

export default function MaintenanceLog() {
  const params = useParams();
  const bikeId = params.bikeId as string;

  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TMaintenanceLog | null>(null);
  const limit = 20;

  const { data, isLoading } = useFetchData<{
    result: TMaintenanceLog[];
    meta: number;
  }>(
    ["maintenanceLogs", bikeId, page.toString()],
    `/bikes/${bikeId}/maintenance-logs?page=${page}&limit=${limit}&sort=-serviceDate`,
  );

  const { mutateAsync: deleteMutation } = useDelete([
    ["maintenanceLogs", bikeId],
    ["reminders", bikeId],
  ]);

  const { data: mtData } = useFetchData<TMaintenanceType[]>(
    ["maintenanceTypes"],
    "/maintenance-types",
  );
  const maintenanceTypes = mtData?.data ?? [];

  const logs = data?.data?.result ?? [];
  const meta = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(meta / limit);

  const handleEdit = (log: TMaintenanceLog) => setEditingLog(log);

  const handleDelete = async (log: TMaintenanceLog) => {
    if (!confirm("Delete this maintenance log?")) return;
    try {
      const result = await deleteMutation({
        url: `/bikes/${bikeId}/maintenance-logs/${log._id}`,
      });
      if (result?.success) {
        toast.success("Maintenance log deleted");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete");
    }
  };

  return (
    <div className="space-y-4 p-3.5 ">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Maintenance Logs</h1>
        <PrimaryButton onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 size-4" />
          Add
        </PrimaryButton>
      </div>

      <RemindersBanner bikeId={bikeId} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No maintenance logs yet.
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log: TMaintenanceLog) => (
            <MaintenanceLogCard
              key={log._id}
              log={log}
              maintenanceTypes={maintenanceTypes}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
          className="rounded-lg border border-border bg-card"
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
    </div>
  );
}
