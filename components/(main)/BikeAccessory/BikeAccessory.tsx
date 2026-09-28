"use client";

import ConfirmDeleteModal from "@/components/shared/Modal/ConfirmDeleteModal";
import PageHeader from "@/components/shared/PageHeader/PageHeader";
import PrimaryButton from "@/components/shared/PrimaryButton/PrimaryButton";
import StateCard from "@/components/shared/StateCard/StateCard";
import { TablePagination } from "@/components/shared/table/TablePagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDelete, useFetchData } from "@/hooks/useApi";
import { Plus, ShoppingBag } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TBike } from "../Bike/type/bike.types";
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

const STATUS_GROUPS: { status: TAccessoryStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "purchased", label: "Purchased" },
  { status: "cancelled", label: "Cancelled" },
];

export default function BikeAccessory() {
  const params = useParams();
  const bikeId = params?.bikeId as string;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<TUrgencyFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] =
    useState<TBikeAccessory | null>(null);
  const [deletingAccessory, setDeletingAccessory] =
    useState<TBikeAccessory | null>(null);
  const limit = 20;

  const { data, isLoading, isError, error, refetch } =
    useFetchData<TBikeAccessoriesApiResponse>(
      ["bikeAccessories", bikeId, page?.toString(), statusFilter, urgencyFilter],
      `/bikes/${bikeId}/accessories?page=${page}&limit=${limit}${
        statusFilter !== "all" ? `&status=${statusFilter}` : ""
      }${urgencyFilter !== "all" ? `&urgency=${urgencyFilter}` : ""}`,
    );

  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );

  const { mutateAsync: deleteMutation, isPending: isDeleting } = useDelete([
    ["bikeAccessories", bikeId],
    ["spending", bikeId],
  ]);

  const accessories = data?.data?.result ?? [];
  const meta = data?.data?.meta ?? 0;
  const totalPages = Math.ceil(meta / limit);

  const handleStatusFilterChange = (value: TStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleUrgencyFilterChange = (value: TUrgencyFilter) => {
    setUrgencyFilter(value);
    setPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccessory) return;
    try {
      const result = await deleteMutation({
        url: `/bikes/${bikeId}/accessories/${deletingAccessory?._id}`,
      });
      if (result?.success) {
        toast.success("Accessory deleted");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Failed to delete");
    } finally {
      setDeletingAccessory(null);
    }
  };

  const groups = STATUS_GROUPS?.map((g) => ({
    ...g,
    items: accessories?.filter((a) => a?.status === g?.status),
  }))?.filter((g) => g?.items?.length > 0);

  const subtitle =
    isLoading || meta === 0
      ? ""
      : groups?.map((g) => `${g?.items?.length} ${g?.label?.toLowerCase()}`)?.join(" · ");

  const addButton = (label: string) => (
    <PrimaryButton onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      {label}
    </PrimaryButton>
  );

  const renderCard = (accessory: TBikeAccessory) => (
    <BikeAccessoryCard
      key={accessory?._id}
      accessory={accessory}
      onEdit={setEditingAccessory}
      onDelete={setDeletingAccessory}
    />
  );

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        title="Accessories"
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: bikeData?.data?.nickname ?? "Bike",
            href: `/bikes/${bikeId}`,
          },
          { label: "Accessories" },
        ]}
        description={subtitle}
        actions={
          <>
            <span className="lg:hidden">{addButton("Add")}</span>
            <span className="hidden lg:inline-flex">
              {addButton("Add accessory")}
            </span>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            handleStatusFilterChange(value as TStatusFilter)
          }
        >
          <SelectTrigger size="sm" className="w-[150px]">
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
          <SelectTrigger size="sm" className="w-[150px]">
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
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-[10px]" />
          ))}
        </div>
      ) : isError ? (
        <StateCard
          variant="error"
          title="Couldn’t load accessories"
          message={error?.message}
          onRetry={() => refetch()}
        />
      ) : accessories?.length === 0 ? (
        <StateCard
          icon={ShoppingBag}
          title={
            statusFilter === "all" && urgencyFilter === "all"
              ? "Wishlist is empty"
              : "No accessories match these filters"
          }
          message="Track accessories you plan to buy. Marking one purchased adds its price to spending."
          action={addButton("Add accessory")}
        />
      ) : (
        groups?.map((group) => (
          <section key={group?.status} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs tracking-[0.08em] text-muted-foreground uppercase">
              {group?.label}
              <span className="tracking-normal tabular-nums">
                {group?.items?.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
              {group?.items?.map(renderCard)}
            </div>
          </section>
        ))
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
        <BikeAccessoryFormModal
          open
          onClose={() => setCreateOpen(false)}
          bikeId={bikeId}
        />
      )}

      {editingAccessory && (
        <BikeAccessoryFormModal
          open
          onClose={() => setEditingAccessory(null)}
          bikeId={bikeId}
          accessory={editingAccessory}
        />
      )}

      <ConfirmDeleteModal
        open={!!deletingAccessory}
        onClose={() => setDeletingAccessory(null)}
        onConfirm={handleConfirmDelete}
        title="Delete accessory?"
        description="This accessory will be permanently removed and cannot be undone."
        isLoading={isDeleting}
      />
    </div>
  );
}
