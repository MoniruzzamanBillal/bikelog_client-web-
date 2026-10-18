"use client";

import ControlledCheckbox from "@/components/shared/input/ControlledCheckbox";
import ControlledDateSelect from "@/components/shared/input/ControlledDateSelect";
import ControlledInput from "@/components/shared/input/ControlledInput";
import ControlledSelectField from "@/components/shared/input/ControlledSelectField";
import ControlledTextArea from "@/components/shared/input/ControlledTextArea";
import BaseModal from "@/components/shared/Modal/BaseModal";
import FormActionButtons from "@/components/shared/Modal/FormActionButtons";
import { Button } from "@/components/ui/button";
import { useFetchData, usePatch, usePost } from "@/hooks/useApi";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { TEngineOilType } from "../SettingsCatalog/type/engine-oil-type.types";
import {
  engineOilLogSchema,
  TEngineOilLogFormType,
} from "./schema/engine-oil-log.schema";
import {
  TCreateEngineOilLogPayload,
  TEngineOilLog,
} from "./type/engine-oil-log.types";

/** Everything the "Same as last change" button carries over (§H). */
export type TEngineOilLogSeed = {
  oilType: string;
  intervalKmUsed: string;
  quantityLiters: string;
  oilFilterChanged: boolean;
  serviceCenter: string;
  cost: string;
};

type TProps = {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  log?: TEngineOilLog;
  // ! §H: never carries the odometer reading or the date — those two are the whole reason
  // ! the rider opened the form, and a prefilled odometer is a wrong odometer that looks
  // ! right (H-W11)
  seed?: TEngineOilLogSeed;
};

export default function EngineOilLogFormModal({
  open,
  onClose,
  bikeId,
  log,
  seed,
}: TProps) {
  const isEditMode = !!log;

  // ! same key as the catalog page, so the dropdown is served from cache (§C)
  const { data: oilData } = useFetchData<TEngineOilType[]>(
    ["engineOilTypes"],
    "/engine-oil-types",
  );
  // ! useMemo, not a bare `?? []` — a fresh array literal every render would change the
  // ! seeding effect's dependencies on every render (the ref below stops it looping, but
  // ! the dependency really is unstable and ESLint is right to say so).
  const oilTypes = useMemo(() => oilData?.data ?? [], [oilData]);

  // an oil log moves the odometer, the forecast, spending and the reminder (§C)
  const invalidateKeys = [
    ["engineOilLogs", bikeId],
    ["engineOilStatus", bikeId],
    ["bikes", bikeId],
    ["spending", bikeId],
    ["reminders", bikeId],
  ];

  const { mutateAsync: createMutation, isPending: isCreating } =
    usePost(invalidateKeys);
  const { mutateAsync: updateMutation, isPending: isUpdating } =
    usePatch(invalidateKeys);
  const isPending = isCreating || isUpdating;

  const storedOilTypeId =
    log?.oilType && typeof log?.oilType === "object"
      ? log?.oilType?._id
      : ((log?.oilType as string | null) ?? "");

  const defaultOilType = isEditMode ? storedOilTypeId : (seed?.oilType ?? "");
  // ! H-W6 rule 3: edit mode seeds the interval from the LOG's stored value, never from
  // ! today's catalog — the stored number is what this log's due point was computed from
  // ! (server spec 54 H6), and re-seeding it would silently move that due point on save.
  const defaultInterval = isEditMode
    ? (log?.intervalKmUsed?.toString() ?? "")
    : (seed?.intervalKmUsed ?? "");

  const methods = useForm<TEngineOilLogFormType>({
    resolver: zodResolver(engineOilLogSchema),
    defaultValues: {
      oilType: defaultOilType,
      odometerReading: isEditMode ? (log?.odometerReading?.toString() ?? "") : "",
      intervalKmUsed: defaultInterval,
      quantityLiters: isEditMode
        ? (log?.quantityLiters?.toString() ?? "")
        : (seed?.quantityLiters ?? ""),
      oilFilterChanged: isEditMode
        ? !!log?.oilFilterChanged
        : (seed?.oilFilterChanged ?? false),
      cost: isEditMode ? (log?.cost?.toString() ?? "") : (seed?.cost ?? ""),
      changeDate: log?.changeDate ? new Date(log?.changeDate) : new Date(),
      serviceCenter: isEditMode
        ? (log?.serviceCenter ?? "")
        : (seed?.serviceCenter ?? ""),
      notes: isEditMode ? (log?.notes ?? "") : "",
    },
  });

  const watchedOilType = methods?.watch("oilType");
  const selectedOilType = oilTypes?.find((o) => o?._id === watchedOilType);

  // ! H-W6, the whole rule in one ref. We re-seed the interval only when the oil type
  // ! ACTUALLY CHANGES (rule 1) — never on a re-render, so a hand-typed value survives
  // ! (rule 2). Opening with a type AND an interval already filled in (edit mode, or the
  // ! §H quick-fill) adopts that pairing as-is, which is rules 2 and 3 for free:
  // ! `bikelog_app` spec 54a is a defect report about the mirror-image failure.
  const seededTypeRef = useRef<string | null>(
    defaultOilType && defaultInterval ? defaultOilType : null,
  );

  useEffect(() => {
    if (!watchedOilType) return;
    if (seededTypeRef?.current === watchedOilType) return;
    seededTypeRef.current = watchedOilType;

    const picked = oilTypes?.find((o) => o?._id === watchedOilType);
    // ! every oil type has a suggestion — the catalog makes suggestedIntervalKm required
    // ! and positive — so the seed never leaves this field empty
    if (picked?.suggestedIntervalKm != null) {
      methods?.setValue("intervalKmUsed", String(picked?.suggestedIntervalKm), {
        shouldValidate: true,
      });
    }
  }, [watchedOilType, oilTypes, methods]);

  const onSubmit = async (data: TEngineOilLogFormType) => {
    try {
      // ! H-W9: server-derived fields never go in the payload. nextDueOdometer,
      // ! kmSinceChange, percentUsed, kmOnThisOil and costPerKm are all read-only.
      const basePayload: TCreateEngineOilLogPayload = {
        oilType: data?.oilType,
        odometerReading: Number(data?.odometerReading),
        intervalKmUsed: Number(data?.intervalKmUsed),
        quantityLiters: data?.quantityLiters
          ? Number(data?.quantityLiters)
          : undefined,
        oilFilterChanged: data?.oilFilterChanged,
        cost: Number(data?.cost),
        changeDate: data?.changeDate?.toISOString(),
        serviceCenter: data?.serviceCenter || undefined,
        notes: data?.notes || undefined,
      };

      if (isEditMode) {
        const result = await updateMutation({
          url: `/bikes/${bikeId}/engine-oil-logs/${log?._id}`,
          payload: basePayload as unknown as Record<string, unknown>,
        });
        if (result?.success) {
          toast.success("Engine oil log updated");
        }
      } else {
        const result = await createMutation({
          url: `/bikes/${bikeId}/engine-oil-logs`,
          payload: basePayload as unknown as Record<string, unknown>,
        });
        if (result?.success) {
          toast.success("Engine oil log created");
        }
      }
      onClose();
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong");
    }
  };

  const oilOptions = oilTypes?.map((ot) => ({
    label: `${ot?.name} (${ot?.suggestedIntervalKm?.toLocaleString()} km)`,
    value: ot?._id,
  }));

  // ! H-W10: catalogs are per-user and nothing is seeded, so a new user's oil-type list is
  // ! legitimately empty and the form is then unusable. Point at Settings instead of
  // ! showing a dead select. Create mode only — a rider who soft-deleted every oil type
  // ! must still be able to fix an existing log's cost or odometer.
  const hasNoOilTypes = !isEditMode && oilOptions?.length === 0;

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={isEditMode ? "Edit Oil Change" : "Log Oil Change"}
    >
      {hasNoOilTypes ? (
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="m-0 text-sm text-muted-foreground">
            You haven&apos;t added any engine oil types yet, so there is nothing
            to log against. Your catalog is yours alone and starts empty — add
            the oil you use, with the interval you change it at, and come back
            here.
          </p>
          <Link href="/settings/catalog" onClick={onClose}>
            <Button type="button">Go to engine oil catalog</Button>
          </Link>
        </div>
      ) : (
        <FormProvider {...methods}>
          <form
            onSubmit={methods?.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <ControlledSelectField
              name="oilType"
              label="Engine Oil"
              options={oilOptions}
              isRequired
              placeholder="Select oil type"
            />

            <ControlledInput
              name="odometerReading"
              label="Odometer Reading (km)"
              type="number"
              step="0.01"
              isRequired
            />

            <div>
              <ControlledInput
                name="intervalKmUsed"
                label="Interval (km)"
                type="number"
                step="0.01"
                isRequired
              />
              {selectedOilType && (
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  Suggested for {selectedOilType?.name}:{" "}
                  {selectedOilType?.suggestedIntervalKm?.toLocaleString()} km —
                  change it here if you did something different.
                </p>
              )}
            </div>

            <ControlledInput
              name="quantityLiters"
              label="Oil Quantity (L) (optional)"
              type="number"
              step="0.01"
            />

            <ControlledCheckbox
              name="oilFilterChanged"
              label="Oil filter changed"
            />

            <ControlledInput
              name="cost"
              label="Cost (৳)"
              type="number"
              step="0.01"
              isRequired
            />

            <ControlledDateSelect name="changeDate" label="Date" isRequired />

            <ControlledInput
              name="serviceCenter"
              label="Service Centre (optional)"
              placeholder="e.g. Honda Service"
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
