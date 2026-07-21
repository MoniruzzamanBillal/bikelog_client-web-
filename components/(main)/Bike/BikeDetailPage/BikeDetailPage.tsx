"use client";

import { useDelete, useFetchData } from "@/hooks/useApi";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import BaseModal from "@/components/shared/Modal/BaseModal";
import ModalActionButtons from "@/components/shared/Modal/ModalActionButtons";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Fuel,
  Gauge,
  ShoppingBag,
  Wallet,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import RemindersBanner from "../../MaintenanceLog/RemindersBanner";
import BikeFormModal from "../BikeFormModal";
import { TBike } from "../type/bike.types";

const BikeDetailPage = () => {
  const { bikeId } = useParams<{ bikeId: string }>();

  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  const { mutateAsync: deleteBikeMutation, isPending: isDeleting } = useDelete([
    ["bikes"],
  ]);

  const handleDelete = async () => {
    try {
      const resut = await deleteBikeMutation({ url: `/bikes/${bikeId}` });

      console.log("delete result = ", resut);

      if (resut?.success) {
        toast.success("Bike deleted successfully");
        router.replace("/dashboard");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong!!", { duration: 2000 });
    }
  };

  const bike = data?.data;

  if (isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading...</p>;
  }

  if (!bike) {
    return <p className="p-4 text-sm text-muted-foreground">Bike not found.</p>;
  }

  const links = [
    { href: `/bikes/${bikeId}/fuel-logs`, label: "Fuel Logs", icon: Fuel },
    { href: `/bikes/${bikeId}/mileage`, label: "Mileage", icon: Gauge },
    {
      href: `/bikes/${bikeId}/maintenance-logs`,
      label: "Maintenance",
      icon: Wrench,
    },
    { href: `/bikes/${bikeId}/spending`, label: "Spending", icon: Wallet },
    { href: `/bikes/${bikeId}/issues`, label: "Issues", icon: AlertTriangle },
    {
      href: `/bikes/${bikeId}/accessories`,
      label: "Accessories",
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h1 className="text-lg font-semibold">{bike.nickname}</h1>
        <p className="text-sm text-surface-text">
          {bike.brand} {bike.model}
        </p>
        <p className="mt-2 text-sm text-surface-text">
          Odometer: {bike.currentOdometer.toLocaleString()} km
        </p>
        <p className="text-sm text-surface-text">
          Reg: {bike.registrationNumber}
        </p>

        <div className="mt-4 flex gap-3">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      <RemindersBanner bikeId={bikeId} />

      <div className="grid grid-cols-2 gap-3  ">
        {links &&
          links?.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4  "
            >
              <Icon className="size-6" />
              <span className="text-sm">{label}</span>
            </Link>
          ))}
      </div>

      <BikeFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bike={bike}
      />

      <BaseModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete bike?"
        showDeleteIcon
      >
        <p className="text-sm text-muted-foreground">
          This will permanently remove &quot;{bike.nickname}&quot; and cannot be
          undone.
        </p>
        <ModalActionButtons
          confirmText="Delete"
          onConfirm={handleDelete}
          isLoading={isDeleting}
        />
      </BaseModal>
    </div>
  );
};

export default BikeDetailPage;
