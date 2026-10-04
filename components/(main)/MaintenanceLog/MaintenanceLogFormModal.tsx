"use client";

import BaseModal from "@/components/shared/Modal/BaseModal";
import { Button } from "@/components/ui/button";
import FormActionButtons from "@/components/shared/Modal/FormActionButtons";
import ControlledDateSelect from "@/components/shared/input/ControlledDateSelect";
import ControlledInput from "@/components/shared/input/ControlledInput";
import ControlledSelectField from "@/components/shared/input/ControlledSelectField";
import ControlledTextArea from "@/components/shared/input/ControlledTextArea";
import { useFetchData, usePatch, usePost } from "@/hooks/useApi";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TEngineOilType } from "../SettingsCatalog/type/engine-oil-type.types";
import { TMaintenanceType } from "../SettingsCatalog/type/maintenance-type.types";
import {
  maintenanceLogSchema,
  TMaintenanceLogFormType,
} from "./schema/maintenance-log.schema";
import {
  TCreateMaintenanceLogPayload,
  TMaintenanceLog,
} from "./type/maintenance-log.types";

type TProps = {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  log?: TMaintenanceLog;
};

export default function MaintenanceLogFormModal({
  open,
  onClose,
  bikeId,
  log,
}: TProps) {
  const isEditMode = !!log;
  const { data: mtData } = useFetchData<TMaintenanceType[]>(
    ["maintenanceTypes"],
    "/maintenance-types",
  );
  const { data: oilData } = useFetchData<TEngineOilType[]>(
    ["engineOilTypes"],
    "/engine-oil-types",
  );
  const maintenanceTypes = mtData?.data ?? [];
  const oilTypes = oilData?.data ?? [];

  const methods = useForm<TMaintenanceLogFormType>({
    resolver: zodResolver(maintenanceLogSchema),
    defaultValues: {
      maintenanceType: "",
      odometerReading: "",
      oilType: "",
      intervalKmUsed: "",
      cost: "",
      serviceDate: new Date(),
      nextDueDate: undefined,
      serviceCenter: "",
      partsReplaced: "",
      notes: "",
    },
  });

  const watchedType = methods?.watch("maintenanceType");
  const selectedMt = maintenanceTypes?.find((mt) => mt?._id === watchedType);
  // ! Spec 30 §B: gated on the server's `requiresOilType` flag, not on the type's name.
  // ! The old `selectedMt?.name === "Engine Oil"` match only worked because the global
  // ! catalog was seeded with that exact row — with per-user catalogs and no seeding
  // ! (server spec 42) a new user could never surface this field at all.
  const isEngineOil = !!selectedMt?.requiresOilType;

  useEffect(() => {
    if (!isEngineOil) {
      methods?.setValue("oilType", "");
    }
  }, [isEngineOil, methods]);

  useEffect(() => {
    if (!log) return;
    methods?.reset({
      maintenanceType:
        typeof log?.maintenanceType === "object"
          ? log?.maintenanceType?._id
          : log?.maintenanceType,
      odometerReading: log?.odometerReading?.toString(),
      oilType:
        typeof log?.oilType === "object" && log?.oilType
          ? log?.oilType?._id
          : ((log?.oilType as string) ?? ""),
      intervalKmUsed: log?.intervalKmUsed?.toString() ?? "",
      cost: log?.cost?.toString(),
      serviceDate: log?.serviceDate ? new Date(log?.serviceDate) : new Date(),
      nextDueDate: log?.nextDueDate ? new Date(log?.nextDueDate) : undefined,
      serviceCenter: log?.serviceCenter ?? "",
      partsReplaced: log?.partsReplaced?.join(", ") ?? "",
      notes: log?.notes ?? "",
    });
  }, [log, methods]);

  const { mutateAsync: createMutation, isPending: isCreating } = usePost([
    ["maintenanceLogs", bikeId],
    ["reminders", bikeId],
  ]);

  const { mutateAsync: updateMutation, isPending: isUpdating } = usePatch([
    ["maintenanceLogs", bikeId],
    ["maintenanceLogs", bikeId, log?._id ?? ""],
    ["reminders", bikeId],
  ]);
  const isPending = isCreating || isUpdating;

  const onSubmit = async (data: TMaintenanceLogFormType) => {
    try {
      const parts: string[] = data?.partsReplaced
        ? data?.partsReplaced
            ?.split(",")
            ?.map((s) => s?.trim())
            ?.filter(Boolean)
        : [];

      const basePayload: TCreateMaintenanceLogPayload = {
        maintenanceType: data?.maintenanceType,
        odometerReading: Number(data?.odometerReading),
        intervalKmUsed: data?.intervalKmUsed
          ? Number(data?.intervalKmUsed)
          : undefined,
        cost: Number(data?.cost),
        oilType: data?.oilType || undefined,
        serviceDate: data?.serviceDate?.toISOString(),
        nextDueDate: data?.nextDueDate?.toISOString(),
        serviceCenter: data?.serviceCenter || undefined,
        partsReplaced: parts?.length > 0 ? parts : undefined,
        notes: data?.notes || undefined,
      };

      if (isEditMode) {
        const result = await updateMutation({
          url: `/bikes/${bikeId}/maintenance-logs/${log?._id}`,
          payload: basePayload as unknown as Record<string, unknown>,
        });
        if (result?.success) {
          toast.success("Maintenance log updated");
        }
      } else {
        const result = await createMutation({
          url: `/bikes/${bikeId}/maintenance-logs`,
          payload: basePayload as unknown as Record<string, unknown>,
        });
        if (result?.success) {
          toast.success("Maintenance log created");
        }
      }
      onClose();
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong");
    }
  };

  const mtOptions = maintenanceTypes?.map((mt) => ({
    label: mt?.name,
    value: mt?._id,
  }));
  // ! Spec 30 §C: with per-user catalogs and no seeding (server spec 42), a brand-new
  // ! user's catalog is legitimately empty — and an empty ControlledSelectField just looks
  // ! like a broken form. Show the way to Settings instead of a dead select.
  // ! Create mode ONLY: a user who soft-deleted every type still has existing logs, and
  // ! must be able to edit one's odometer/cost/notes. Swapping the whole form out in edit
  // ! mode would take away more than the type select they cannot use anyway.
  const hasNoTypes = !isEditMode && mtOptions?.length === 0;
  const oilOptions = oilTypes?.map((ot) => ({
    label: `${ot?.name} (${ot?.suggestedIntervalKm} km)`,
    value: ot?._id,
  }));

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={isEditMode ? "Edit Maintenance" : "Add Maintenance"}
    >
      {hasNoTypes ? (
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="m-0 text-sm text-muted-foreground">
            You haven&apos;t added any maintenance types yet, so there is
            nothing to log against. Your catalog is yours alone and starts empty
            — add the services you want to track (oil change, chain lube, tyres)
            and come back here.
          </p>
          <Link href="/settings/catalog" onClick={onClose}>
            <Button type="button">Go to maintenance catalog</Button>
          </Link>
        </div>
      ) : (
        <FormProvider {...methods}>
          <form
            onSubmit={methods?.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <ControlledSelectField
              name="maintenanceType"
              label="Maintenance Type"
              options={mtOptions}
              isRequired
              placeholder="Select type"
            />

            <ControlledInput
              name="odometerReading"
              label="Odometer (km)"
              type="number"
              step="0.01"
              isRequired
            />

            {isEngineOil && (
              <ControlledSelectField
                name="oilType"
                label="Engine Oil Type"
                options={oilOptions}
                placeholder="Select oil type"
              />
            )}

            <ControlledInput
              name="intervalKmUsed"
              label="Service Interval (km) (optional)"
              type="number"
              step="0.01"
            />

            <ControlledInput
              name="cost"
              label="Cost (৳)"
              type="number"
              step="0.01"
              isRequired
            />

            <ControlledDateSelect
              name="serviceDate"
              label="Service Date"
              isRequired
            />

            {/* <div className="space-y-1">
            <label className="mb-1.5 block text-xs text-foreground/70">
              Service Date<span className="ml-0.5 text-destructive">*</span>
            </label>
            <Controller
              name="serviceDate"
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

            <ControlledDateSelect
              name="nextDueDate"
              label="Next Due Date (optional)"
            />

            {/* <div className="space-y-1">
            <label className="mb-1.5 block text-xs text-foreground/70">
              Next Due Date (optional)
            </label>
            <Controller
              name="nextDueDate"
              control={methods.control}
              render={({ field }) => (
                <DateSelect
                  value={field.value}
                  onChange={(date) => field.onChange(date)}
                  mode="single"
                  placeholder="Optional due date"
                />
              )}
            />
          </div> */}

            <ControlledInput
              name="serviceCenter"
              label="Service Center (optional)"
              placeholder="e.g. Honda Service"
            />

            <ControlledInput
              name="partsReplaced"
              label="Parts Replaced (optional)"
              placeholder="Comma-separated: Oil Filter, Engine Oil"
            />

            <ControlledTextArea
              name="notes"
              label="Notes (optional)"
              placeholder="Any notes..."
              rows={3}
            />

            <FormActionButtons isEditMode={isEditMode} isPending={isPending} />
          </form>
        </FormProvider>
      )}
    </BaseModal>
  );
}
