"use client";

import BaseModal from "@/components/shared/Modal/BaseModal";
import FormActionButtons from "@/components/shared/Modal/FormActionButtons";
import ControlledInput from "@/components/shared/input/ControlledInput";
import ControlledSelectField from "@/components/shared/input/ControlledSelectField";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { usePatch, usePost } from "@/hooks/useApi";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  bikeAccessorySchema,
  TBikeAccessoryFormType,
} from "./schema/bike-accessory.schema";
import {
  TBikeAccessory,
  TCreateBikeAccessoryPayload,
} from "./type/bike-accessory.types";

const URGENCY_OPTIONS = [
  { label: "Immediate", value: "immediate" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Purchased", value: "purchased" },
  { label: "Cancelled", value: "cancelled" },
];

type TBikeAccessoryFormModalProps = {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  accessory?: TBikeAccessory;
};

export default function BikeAccessoryFormModal({
  open,
  onClose,
  bikeId,
  accessory,
}: TBikeAccessoryFormModalProps) {
  const isEditMode = !!accessory;

  const { mutateAsync, isPending: isCreating } = usePost([
    ["bikeAccessories", bikeId],
  ]);

  const { mutateAsync: updateMutation, isPending: isUpdating } = usePatch([
    ["bikeAccessories", bikeId],
  ]);

  const methods = useForm<TBikeAccessoryFormType>({
    resolver: zodResolver(bikeAccessorySchema),
    defaultValues: {
      name: accessory?.name ?? "",
      urgency: accessory?.urgency ?? "",
      status: accessory?.status ?? "pending",
    },
  });

  const isPending = isCreating || isUpdating;

  const onSubmit = async (data: TBikeAccessoryFormType) => {
    try {
      const basePayload: TCreateBikeAccessoryPayload = {
        name: data.name,
        urgency: data.urgency as TCreateBikeAccessoryPayload["urgency"],
        status: data.status as TCreateBikeAccessoryPayload["status"],
      };

      if (isEditMode) {
        const result = await updateMutation({
          url: `/bikes/${bikeId}/accessories/${accessory?._id}`,
          payload: basePayload as unknown as Record<string, unknown>,
        });

        if (result?.success) {
          toast.success("Accessory updated successfully");
        }
      } else {
        const result = await mutateAsync({
          url: `/bikes/${bikeId}/accessories`,
          payload: basePayload as unknown as Record<string, unknown>,
        });

        if (result?.success) {
          toast.success("Accessory added successfully");
        }
      }
      onClose();
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong!!", { duration: 2000 });
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={isEditMode ? "Edit Accessory" : "Add Accessory"}
    >
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
          <ControlledInput
            name="name"
            label="Name"
            placeholder="e.g., LED Headlight"
            isRequired
          />

          <ControlledSelectField
            name="urgency"
            label="Urgency"
            options={URGENCY_OPTIONS}
            placeholder="Select urgency"
            isRequired
          />

          <ControlledSelectField
            name="status"
            label="Status"
            options={STATUS_OPTIONS}
            placeholder="Select status"
          />

          <FormActionButtons isEditMode={isEditMode} isPending={isPending} />
        </form>
      </FormProvider>
    </BaseModal>
  );
}
