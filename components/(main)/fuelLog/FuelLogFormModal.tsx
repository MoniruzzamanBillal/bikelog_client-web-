"use client";

import BaseModal from "@/components/shared/Modal/BaseModal";
import FormActionButtons from "@/components/shared/Modal/FormActionButtons";
import ControlledCheckbox from "@/components/shared/input/ControlledCheckbox";
import ControlledInput from "@/components/shared/input/ControlledInput";
import ControlledTextArea from "@/components/shared/input/ControlledTextArea";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import ControlledDateSelect from "@/components/shared/input/ControlledDateSelect";
import { usePatch, usePost } from "@/hooks/useApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { fuelLogSchema, TFuelLogFormType } from "./schema/fuel-log.schema";
import { TCreateFuelLogPayload, TFuelLog } from "./type/fuel-log.types";

type TFuelLogFormModalProps = {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  fuelLog?: TFuelLog;
};

export default function FuelLogFormModal({
  open,
  onClose,
  bikeId,
  fuelLog,
}: TFuelLogFormModalProps) {
  const isEditMode = !!fuelLog;

  const { mutateAsync, isPending: isCreating } = usePost([
    ["fuelLogs", bikeId],
  ]);

  const { mutateAsync: updateMutation, isPending: isUpdating } = usePatch([
    ["fuelLogs", bikeId],
  ]);

  const methods = useForm<TFuelLogFormType>({
    resolver: zodResolver(fuelLogSchema),
    defaultValues: {
      odometerReading: fuelLog?.odometerReading?.toString() ?? "",
      litersAdded: fuelLog?.litersAdded?.toString() ?? "",
      isFullTank: fuelLog?.isFullTank ?? false,
      pricePerLiter: fuelLog?.pricePerLiter?.toString() ?? "",
      fuelStation: fuelLog?.fuelStation ?? "",
      date: fuelLog?.date ? new Date(fuelLog.date) : new Date(),
      notes: fuelLog?.notes ?? "",
    },
  });

  const isPending = isCreating || isUpdating;

  const onSubmit = async (data: TFuelLogFormType) => {
    try {
      const basePayload: TCreateFuelLogPayload = {
        odometerReading: Number(data.odometerReading),
        litersAdded: Number(data.litersAdded),
        isFullTank: data.isFullTank,
        pricePerLiter: Number(data.pricePerLiter),
        fuelStation: data.fuelStation || undefined,
        date: data.date?.toISOString(),
        notes: data.notes || undefined,
      };

      if (isEditMode) {
        const result = await updateMutation({
          url: `/bikes/${bikeId}/fuel-logs/${fuelLog?._id}`,
          payload: basePayload as unknown as Record<string, unknown>,
        });

        if (result?.success) {
          toast.success("Fuel log updated successfully");
        }
      } else {
        const response = await mutateAsync({
          url: `/bikes/${bikeId}/fuel-logs`,
          payload: basePayload as unknown as Record<string, unknown>,
        });

        if (response?.success) {
          toast.success("Fuel log created successfully");
        }

        if (response.data.mileageRecordClosed) {
          toast.success(
            `Mileage: ${response.data.mileageRecordClosed.mileageKmPerLiter.toFixed(2)} km/l for this tank`,
            { duration: 5000 },
          );
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
      title={isEditMode ? "Edit Fuel Log" : "Add Fuel Log"}
    >
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
          <ControlledInput
            name="odometerReading"
            label="Odometer Reading (km)"
            type="number"
            isRequired
          />

          <ControlledInput
            name="litersAdded"
            label="Liters Added"
            type="number"
            step="0.01"
            isRequired
          />

          <ControlledInput
            name="pricePerLiter"
            label="Price per Liter"
            type="number"
            step="0.01"
            isRequired
          />

          <ControlledCheckbox name="isFullTank" label="Full Tank Fill" />

          <ControlledInput
            name="fuelStation"
            label="Fuel Station (optional)"
            placeholder="e.g., Shell, BP"
          />

          <ControlledDateSelect name="date" label="Date" isRequired />

          {/* <div className="space-y-1">
            <label className="text-sm font-medium">
              Date<span className="ml-1 text-red-500">*</span>
            </label>
            <Controller
              name="date"
              control={methods.control}
              rules={{ required: true }}
              render={({ field }) => (
                <DateSelect
                  value={field.value}
                  onChange={(date) => field.onChange(date)}
                  mode="single"
                  placeholder="Select date"
                />
              )}
            />
          </div> */}

          <ControlledTextArea
            name="notes"
            label="Notes (optional)"
            placeholder="Any additional notes..."
            rows={3}
          />

          <FormActionButtons isEditMode={isEditMode} isPending={isPending} />
        </form>
      </FormProvider>
    </BaseModal>
  );
}
