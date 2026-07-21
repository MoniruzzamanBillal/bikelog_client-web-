"use client";

import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import BikeAccessoryCard from "./BikeAccessoryCard";
import BikeAccessoryFormModal from "./BikeAccessoryFormModal";
import {
  TAccessoryStatus,
  TAccessoryUrgency,
  TBikeAccessoriesApiResponse,
  TBikeAccessory,
} from "./type/bike-accessory.types";

type TStatusFilter = "all" | TAccessoryStatus;
type TUrgencyFilter = "all" | TAccessoryUrgency;

export default function BikeAccessory() {
  const params = useParams();
  const bikeId = params.bikeId as string;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<TUrgencyFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] =
    useState<TBikeAccessory | null>(null);
  const limit = 20;

  const { data, isLoading } = useFetchData<TBikeAccessoriesApiResponse>(
    ["bikeAccessories", bikeId, page.toString(), statusFilter, urgencyFilter],
    `/bikes/${bikeId}/accessories?page=${page}&limit=${limit}${
      statusFilter !== "all" ? `&status=${statusFilter}` : ""
    }${urgencyFilter !== "all" ? `&urgency=${urgencyFilter}` : ""}`,
  );

  const { mutateAsync: deleteMutation } = useDelete([
    ["bikeAccessories", bikeId],
  ]);

  const accessories = data?.data?.result ?? [];

  const handleEdit = (accessory: TBikeAccessory) =>
    setEditingAccessory(accessory);

  const handleStatusFilterChange = (value: TStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleUrgencyFilterChange = (value: TUrgencyFilter) => {
    setUrgencyFilter(value);
    setPage(1);
  };

  const handleDelete = async (accessory: TBikeAccessory) => {
    if (!confirm("Delete this accessory?")) return;
    try {
      const result = await deleteMutation({
        url: `/bikes/${bikeId}/accessories/${accessory._id}`,
      });
      if (result?.success) {
        toast.success("Accessory deleted");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete");
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Accessories</h1>
        <PrimaryButton onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 size-4" />
          Add
        </PrimaryButton>
      </div>

      <div className="flex flex-wrap gap-2">
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
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="purchased">Purchased</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={urgencyFilter}
          onValueChange={(value) =>
            handleUrgencyFilterChange(value as TUrgencyFilter)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by urgency" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All urgencies</SelectItem>
            <SelectItem value="immediate">Immediate</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : accessories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accessories yet.</p>
      ) : (
        <div className="space-y-3">
          {accessories.map((accessory) => (
            <BikeAccessoryCard
              key={accessory._id}
              accessory={accessory}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <BikeAccessoryFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        bikeId={bikeId}
      />

      {editingAccessory && (
        <BikeAccessoryFormModal
          open
          onClose={() => setEditingAccessory(null)}
          bikeId={bikeId}
          accessory={editingAccessory}
        />
      )}
    </div>
  );
}
