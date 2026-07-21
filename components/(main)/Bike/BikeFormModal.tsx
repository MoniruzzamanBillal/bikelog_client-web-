"use client";

import BaseModal from "@/components/shared/Modal/BaseModal";
import FormActionButtons from "@/components/shared/Modal/FormActionButtons";
import ControlledInput from "@/components/shared/input/ControlledInput";
import DateSelect from "@/components/shared/input/DateSelect";
import { usePatch, usePost } from "@/hooks/useApi";
import {
  Controller,
  FormProvider,
  SubmitHandler,
  useForm,
} from "react-hook-form";
import { toast } from "sonner";
import { TBike, TCreateBikePayload } from "./type/bike.types";

type TBikeFormValues = {
  nickname: string;
  brand: string;
  model: string;
  registrationNumber: string;
  purchaseDate?: Date;
  fuelTankCapacityLiters: string;
  currentOdometer: string;
};

type TBikeFormModalProps = {
  open: boolean;
  onClose: () => void;
  bike?: TBike;
};

export default function BikeFormModal({
  open,
  onClose,
  bike,
}: TBikeFormModalProps) {
  const isEditMode = !!bike;

  const { mutateAsync, isPending: isCreating } = usePost([["bikes"]]);

  const { mutateAsync: patchMutation, isPending: isUpdating } = usePatch([
    ["bikes"],
    ["bikes", bike?._id ?? ""],
  ]);

  const methods = useForm<TBikeFormValues>({
    defaultValues: {
      nickname: bike?.nickname ?? "",
      brand: bike?.brand ?? "",
      model: bike?.model ?? "",
      registrationNumber: bike?.registrationNumber ?? "",
      purchaseDate: bike?.purchaseDate
        ? new Date(bike.purchaseDate)
        : undefined,
      fuelTankCapacityLiters: bike?.fuelTankCapacityLiters?.toString() ?? "",
      currentOdometer: "",
    },
  });

  const isPending = isCreating || isUpdating;

  const onSubmit: SubmitHandler<TBikeFormValues> = async (data) => {
    try {
      const basePayload: TCreateBikePayload = {
        nickname: data.nickname,
        brand: data.brand,
        model: data.model,
        registrationNumber: data.registrationNumber,
        purchaseDate: data.purchaseDate as Date,
        fuelTankCapacityLiters: Number(data.fuelTankCapacityLiters),
      };

      if (isEditMode) {
        const result = await patchMutation({
          url: `/bikes/${bike?._id}`,
          payload: basePayload,
        });

        if (result?.success) {
          toast.success("Bike updated successfully");
        }
      } else {
        const payload = {
          ...basePayload,
          ...(data.currentOdometer
            ? { currentOdometer: Number(data.currentOdometer) }
            : {}),
        };

        const result = await mutateAsync({ url: "/bikes", payload });

        if (result?.success) {
          toast.success("Bike created successfully");
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
      title={isEditMode ? "Edit Bike" : "Add Bike"}
    >
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
          <ControlledInput name="nickname" label="Nickname" isRequired />
          <ControlledInput name="brand" label="Brand" isRequired />
          <ControlledInput name="model" label="Model" isRequired />
          <ControlledInput
            name="registrationNumber"
            label="Registration Number"
            isRequired
          />

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Purchase Date<span className="ml-1 text-red-500">*</span>
            </label>
            <Controller
              name="purchaseDate"
              control={methods.control}
              rules={{ required: true }}
              render={({ field }) => (
                <DateSelect
                  value={field.value}
                  onChange={(date) => field.onChange(date)}
                  mode="single"
                  placeholder="Select purchase date"
                />
              )}
            />
          </div>

          <ControlledInput
            name="fuelTankCapacityLiters"
            label="Fuel Tank Capacity (L)"
            type="number"
            isRequired
          />

          {!isEditMode && (
            <ControlledInput
              name="currentOdometer"
              label="Starting Odometer (km)"
              type="number"
            />
          )}

          <FormActionButtons isEditMode={isEditMode} isPending={isPending} />
        </form>
      </FormProvider>
    </BaseModal>
  );
}
