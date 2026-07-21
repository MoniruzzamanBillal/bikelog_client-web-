"use client";

import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import MaintenanceLogCard from "./MaintenanceLogCard";
import MaintenanceLogFormModal from "./MaintenanceLogFormModal";
import RemindersBanner from "./RemindersBanner";
import { TMaintenanceLog } from "./type/maintenance-log.types";

export default function MaintenanceLog() {
  const params = useParams();
  const bikeId = params.bikeId as string;

  const [page] = useState(1);
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

  const logs = data?.data?.result ?? [];

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
    <div className="space-y-4 p-4">
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
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <MaintenanceLogFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        bikeId={bikeId}
      />

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
