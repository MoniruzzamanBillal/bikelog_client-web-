"use client";

import BaseModal from "@/components/shared/Modal/BaseModal";
import FormActionButtons from "@/components/shared/Modal/FormActionButtons";
import ControlledCheckbox from "@/components/shared/input/ControlledCheckbox";
import ControlledInput from "@/components/shared/input/ControlledInput";
import ControlledTextArea from "@/components/shared/input/ControlledTextArea";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { toast } from "sonner";

import ControlledDateSelect from "@/components/shared/input/ControlledDateSelect";
import { usePatch, usePost } from "@/hooks/useApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { fuelLogSchema, TFuelLogFormType } from "./schema/fuel-log.schema";
import { TCreateFuelLogPayload, TFuelLog } from "./type/fuel-log.types";
import { TFuelLogSeed } from "./useFuelLogSeed";

type TFuelLogFormModalProps = {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  fuelLog?: TFuelLog;
  /** Pre-fill a NEW fill-up from the last log (spec 52). Ignored in edit mode. */
  seedFromLastLog?: TFuelLogSeed;
  /** The bike's `currentOdometer` — the floor of the server's accepted range. */
  seedOdometer?: number;
};

/** ["price", "station", "tank setting"] -> "Price, station and tank setting" */
const toSentence = (items: string[]) => {
  const joined =
    items.length > 1
      ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
      : items[0];
  return joined.charAt(0).toUpperCase() + joined.slice(1);
};

export default function FuelLogFormModal({
  open,
  onClose,
  bikeId,
  fuelLog,
  seedFromLastLog,
  seedOdometer,
}: TFuelLogFormModalProps) {
  const isEditMode = !!fuelLog;

  // a fill moves the odometer, mileage and spending — refresh the hub's stats too
  const invalidateKeys = [
    ["fuelLogs", bikeId],
    ["bikes", bikeId],
    ["mileage"],
    ["spending", bikeId],
    ["reminders", bikeId],
  ];

  const { mutateAsync, isPending: isCreating } = usePost(invalidateKeys);

  const { mutateAsync: updateMutation, isPending: isUpdating } =
    usePatch(invalidateKeys);

  // ! The edit path must never seed — seeds are read only when `!isEditMode`.
  const seededDefaults: TFuelLogFormType = {
    odometerReading: isEditMode
      ? (fuelLog?.odometerReading?.toString() ?? "")
      : (seedOdometer?.toString() ?? ""),
    litersAdded: fuelLog?.litersAdded?.toString() ?? "",
    isFullTank: isEditMode
      ? (fuelLog?.isFullTank ?? false)
      : (seedFromLastLog?.isFullTank ?? false),
    pricePerLiter: isEditMode
      ? (fuelLog?.pricePerLiter?.toString() ?? "")
      : (seedFromLastLog?.pricePerLiter?.toString() ?? ""),
    fuelStation: isEditMode
      ? (fuelLog?.fuelStation ?? "")
      : (seedFromLastLog?.fuelStation ?? ""),
    date: fuelLog?.date ? new Date(fuelLog?.date) : new Date(),
    notes: fuelLog?.notes ?? "",
  };

  const methods = useForm<TFuelLogFormType>({
    resolver: zodResolver(fuelLogSchema),
    defaultValues: seededDefaults,
  });

  // ! The seed queries can resolve AFTER this modal mounts (cold cache). Re-seed when the
  // ! values arrive, but only while the form is still pristine, so we never clobber typing.
  const { dirtyFields, isDirty } = useFormState({ control: methods.control });
  useEffect(() => {
    if (isEditMode || isDirty) return;
    methods.reset(seededDefaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedOdometer, seedFromLastLog?.pricePerLiter, seedFromLastLog?.fuelStation, seedFromLastLog?.isFullTank]);

  const isPending = isCreating || isUpdating;

  // ! §G — a prefilled value you didn't notice is a wrong value you didn't notice. Each hint
  // ! line disappears once you edit the field it describes (tracked via `dirtyFields`).
  const odometerSeeded =
    !isEditMode && seedOdometer != null && !dirtyFields?.odometerReading;
  const carriedOver = !isEditMode
    ? [
        seedFromLastLog?.pricePerLiter !== undefined && !dirtyFields?.pricePerLiter
          ? "price"
          : null,
        seedFromLastLog?.fuelStation && !dirtyFields?.fuelStation
          ? "station"
          : null,
        seedFromLastLog?.isFullTank === true && !dirtyFields?.isFullTank
          ? "tank setting"
          : null,
      ].filter((item): item is string => !!item)
    : [];
  const showSeedHint = odometerSeeded || carriedOver.length > 0;

  const onSubmit = async (data: TFuelLogFormType) => {
    try {
      const basePayload: TCreateFuelLogPayload = {
        odometerReading: Number(data?.odometerReading),
        litersAdded: Number(data?.litersAdded),
        isFullTank: data?.isFullTank,
        pricePerLiter: Number(data?.pricePerLiter),
        fuelStation: data?.fuelStation || undefined,
        date: data?.date?.toISOString(),
        notes: data?.notes || undefined,
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

        if (response?.data?.mileageRecordClosed) {
          toast.success(
            `Mileage: ${response?.data?.mileageRecordClosed?.mileageKmPerLiter?.toFixed(2)} km/l for this tank`,
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
        <form onSubmit={methods?.handleSubmit(onSubmit)} className="space-y-4">
          {showSeedHint && (
            <div className="flex flex-col gap-1 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[11.5px] leading-4 text-accent-foreground">
              {odometerSeeded && (
                <span>
                  Odometer starts at this bike&rsquo;s current reading — change
                  it if you&rsquo;re backdating.
                </span>
              )}
              {carriedOver.length > 0 && (
                <span>
                  {toSentence(carriedOver)} carried over from your last fill-up —
                  check before saving.
                </span>
              )}
            </div>
          )}

          <ControlledInput
            name="odometerReading"
            label="Odometer Reading (km)"
            type="number"
            step="0.01"
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
