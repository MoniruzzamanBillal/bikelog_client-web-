"use client";

import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import GenericTableComponent from "@/components/shared/table/GenericTableComponent";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { fuelLogColumns } from "./fuelLogColumns";
import FuelLogFormModal from "./FuelLogFormModal";
import { TFuelLog, TFuelLogsApiResponse } from "./type/fuel-log.types";

const FuelLog = () => {
  const params = useParams();
  const bikeId = params.bikeId as string;

  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFuelLog, setEditingFuelLog] = useState<TFuelLog | null>(null);
  const limit = 10;

  const { data: fuelLogsData, isLoading } = useFetchData<TFuelLogsApiResponse>(
    ["fuelLogs", bikeId, page.toString()],
    `/bikes/${bikeId}/fuel-logs?page=${page}&limit=${limit}&sort=-date`,
  );

  const { mutateAsync: deleteMutation, isPending } = useDelete([
    ["fuelLogs", bikeId],
  ]);

  const handleEdit = (fuelLog: TFuelLog) => {
    setEditingFuelLog(fuelLog);
  };

  const handleDeleteClick = async (fuelLog: TFuelLog) => {
    if (confirm("Are you sure you want to delete this fuel log?")) {
      try {
        const result = await deleteMutation({
          url: `/bikes/${bikeId}/fuel-logs/${fuelLog?._id}`,
        });
        if (result?.success) {
          toast.success("Fuel log deleted successfully");
        }
      } catch (error) {
        const message = (error as { message?: string })?.message;
        toast.error(message ?? "Failed to delete fuel log");
      }
    }
  };

  const result = fuelLogsData?.data?.result ?? [];
  const meta = fuelLogsData?.data?.meta ?? 0;
  const totalPages = Math.ceil(meta / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fuel Logs</h1>
          <p className="text-sm text-muted-foreground">
            Track your fuel fill-ups
          </p>
        </div>
        <PrimaryButton onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Fuel Log
        </PrimaryButton>
      </div>

      <GenericTableComponent
        data={result}
        columns={fuelLogColumns({
          onEdit: handleEdit,
          onDelete: handleDeleteClick,
        })}
        isLoading={isLoading}
        totalItems={meta}
        totalPages={totalPages}
        currentPage={page - 1}
        onPageChange={(p) => setPage(p + 1)}
        itemsPerPage={limit}
        showToolbar={false}
        showSerialNumber={true}
      />

      <FuelLogFormModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        bikeId={bikeId}
      />

      {editingFuelLog && (
        <FuelLogFormModal
          open
          onClose={() => setEditingFuelLog(null)}
          bikeId={bikeId}
          fuelLog={editingFuelLog}
        />
      )}
    </div>
  );
};

export default FuelLog;
