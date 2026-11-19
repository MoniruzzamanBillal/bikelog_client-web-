"use client";

import ControlledCheckbox from "@/components/shared/input/ControlledCheckbox";
import ControlledDateSelect from "@/components/shared/input/ControlledDateSelect";
import ControlledInput from "@/components/shared/input/ControlledInput";
import ControlledSelectField from "@/components/shared/input/ControlledSelectField";
import ControlledTextArea from "@/components/shared/input/ControlledTextArea";
import BaseModal from "@/components/shared/Modal/BaseModal";
import FormActionButtons from "@/components/shared/Modal/FormActionButtons";
import { Button } from "@/components/ui/button";
import { usePatch, usePost } from "@/hooks/useApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  serviceLogSchema,
  TServiceLogFormType,
} from "./schema/service-log.schema";
import {
  TCreateServiceLogPayload,
  TServiceLog,
} from "./type/service-log.types";

export type TServiceSeed = {
  serviceKind: "warranty" | "regular";
  serviceCenter: string;
  centerType: string;
};

const KIND_OPTIONS = [
  { label: "Regular", value: "regular" },
  { label: "Warranty", value: "warranty" },
];
const CENTER_OPTIONS = [
  { label: "Official centre", value: "official" },
  { label: "Local centre", value: "local" },
];

const money = (n: number) =>
  n?.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });

type TProps = {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  log?: TServiceLog;
  seed?: TServiceSeed;
  /** Opens an upcoming row straight into complete-mode (the row's Mark completed). */
  startCompleted?: boolean;
};

export default function ServiceLogFormModal({
  open,
  onClose,
  bikeId,
  log,
  seed,
  startCompleted,
}: TProps) {
  const isEditMode = !!log;
  const [showAdvanced, setShowAdvanced] = useState(log?.warrantyNumber != null);

  const invalidateKeys = [
    ["serviceLogs", bikeId],
    ["serviceStatus", bikeId],
    ["bikes", bikeId], // bumpOdometerIfHigher on a completed service (H-W-SVC-11)
    ["spending", bikeId],
    ["reminders", bikeId],
  ];
  const { mutateAsync: createMutation, isPending: isCreating } =
    usePost(invalidateKeys);
  const { mutateAsync: updateMutation, isPending: isUpdating } =
    usePatch(invalidateKeys);
  const isPending = isCreating || isUpdating;

  const methods = useForm<TServiceLogFormType>({
    resolver: zodResolver(serviceLogSchema),
    defaultValues: {
      serviceKind: log?.serviceKind ?? seed?.serviceKind ?? "regular",
      warrantyNumber: log?.warrantyNumber != null ? String(log.warrantyNumber) : "",
      dueDate: log?.dueDate ? new Date(log.dueDate) : undefined,
      completed: !!log?.serviceDate || !!startCompleted,
      serviceDate: log?.serviceDate ? new Date(log.serviceDate) : undefined,
      odometerReading:
        log?.odometerReading != null ? String(log.odometerReading) : "",
      serviceCenter: log?.serviceCenter ?? seed?.serviceCenter ?? "",
      centerType: log?.centerType ?? seed?.centerType ?? "",
      items: (log?.items ?? []).map((i) => ({
        id: i?.id,
        name: i?.name ?? "",
        cost: i?.cost != null ? String(i.cost) : "",
      })),
      recommendations: (log?.recommendations ?? []).map((r) => ({
        id: r?.id,
        text: r?.text ?? "",
        targetDate: r?.targetDate ? new Date(r.targetDate) : null,
        done: r?.done ?? false,
      })),
      notes: log?.notes ?? "",
      nextServiceDue: undefined,
    },
  });

  const { control } = methods;
  const kind = useWatch({ control, name: "serviceKind" });
  const completed = useWatch({ control, name: "completed" });
  const watchedItems = useWatch({ control, name: "items" });

  const itemsFA = useFieldArray({ control, name: "items" });
  const recsFA = useFieldArray({ control, name: "recommendations" });

  const subtotal = (watchedItems ?? []).reduce((sum, it) => {
    const n = Number(it?.cost);
    return sum + (it?.cost && !isNaN(n) ? n : 0);
  }, 0);

  const onSubmit = async (data: TServiceLogFormType) => {
    const payload: TCreateServiceLogPayload = {
      serviceKind: data.serviceKind,
      ...(data.serviceKind === "warranty" && data.warrantyNumber
        ? { warrantyNumber: Number(data.warrantyNumber) }
        : {}),
      ...(data.dueDate ? { dueDate: data.dueDate.toISOString() } : {}),
      ...(data.completed && data.serviceDate
        ? { serviceDate: data.serviceDate.toISOString() }
        : {}),
      ...(data.completed && data.odometerReading
        ? { odometerReading: Number(data.odometerReading) }
        : {}),
      ...(data.serviceCenter ? { serviceCenter: data.serviceCenter } : {}),
      ...(data.centerType
        ? { centerType: data.centerType as "official" | "local" }
        : {}),
      items: data.items
        .filter((it) => it.name.trim())
        .map((it) => ({
          ...(it.id ? { id: it.id } : {}),
          name: it.name.trim(),
          cost: it.cost.trim() ? Number(it.cost) : undefined,
        })),
      // full array, always, ids preserved (H-W-SVC-4)
      recommendations: data.recommendations
        .filter((r) => r.text.trim())
        .map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          text: r.text.trim(),
          ...(r.targetDate ? { targetDate: r.targetDate.toISOString() } : {}),
          done: r.done,
        })),
      ...(data.notes ? { notes: data.notes } : {}),
    };

    try {
      let savedKind: "warranty" | "regular" = data.serviceKind;
      let savedWarrantyNo: number | null = null;

      if (isEditMode) {
        const result = await updateMutation({
          url: `/bikes/${bikeId}/service-logs/${log?._id}`,
          payload: payload as unknown as Record<string, unknown>,
        });
        if (result?.success) toast.success("Service updated");
        savedKind = result?.data?.serviceKind ?? data.serviceKind;
        savedWarrantyNo = result?.data?.warrantyNumber ?? null;
      } else {
        const result = await createMutation({
          url: `/bikes/${bikeId}/service-logs`,
          payload: payload as unknown as Record<string, unknown>,
        });
        if (result?.success)
          toast.success(data.completed ? "Service saved" : "Service scheduled");
        savedKind = result?.data?.serviceKind ?? data.serviceKind;
        savedWarrantyNo = result?.data?.warrantyNumber ?? null;
      }

      // ! §F — schedule the next service. Non-fatal: a failure leaves the completion saved.
      if (data.completed && data.nextServiceDue) {
        const nextKind: "warranty" | "regular" =
          savedKind === "warranty" &&
          savedWarrantyNo != null &&
          savedWarrantyNo < 5
            ? "warranty"
            : "regular";
        try {
          await createMutation({
            url: `/bikes/${bikeId}/service-logs`,
            payload: {
              serviceKind: nextKind,
              dueDate: data.nextServiceDue.toISOString(),
              ...(data.serviceCenter ? { serviceCenter: data.serviceCenter } : {}),
              ...(data.centerType ? { centerType: data.centerType } : {}),
            } as unknown as Record<string, unknown>,
          });
        } catch {
          toast.error("Service saved, but couldn't schedule the next one");
        }
      }

      onClose();
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong");
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={isEditMode ? "Edit service" : "Add service"}
    >
      <FormProvider {...methods}>
        <form onSubmit={methods?.handleSubmit(onSubmit)} className="space-y-4">
          <ControlledSelectField
            name="serviceKind"
            label="Service kind"
            options={KIND_OPTIONS}
            placeholder="Select kind"
          />

          {kind === "warranty" &&
            (showAdvanced ? (
              <ControlledInput
                name="warrantyNumber"
                label="Warranty # (1–5)"
                type="number"
                placeholder="auto-assigned if left blank"
              />
            ) : (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setShowAdvanced(true)}
              >
                Set warranty # manually (auto-assigned otherwise)
              </button>
            ))}

          <ControlledDateSelect
            name="dueDate"
            label="Due date"
            placeholder="Select due date"
          />

          <ControlledCheckbox name="completed" label="Mark as completed" />

          {completed && (
            <>
              <ControlledDateSelect
                name="serviceDate"
                label="Service date"
                isRequired
                placeholder="Select service date"
              />
              <ControlledInput
                name="odometerReading"
                label="Odometer (km)"
                type="number"
                step="0.01"
                isRequired
              />
            </>
          )}

          <ControlledInput
            name="serviceCenter"
            label="Service centre (optional)"
            placeholder="e.g. Honda official centre"
          />

          <ControlledSelectField
            name="centerType"
            label="Centre type (optional)"
            options={CENTER_OPTIONS}
            placeholder="Select centre type"
          />

          {/* ── line items (completed only) — useFieldArray sub-editor (D5) ── */}
          {completed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-foreground/70">
                <span>Line items</span>
                {itemsFA.fields.length > 0 && (
                  <span className="tabular-nums">Total ৳{money(subtotal)}</span>
                )}
              </div>
              {itemsFA.fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                  <div className="flex-[2]">
                    <ControlledInput
                      name={`items.${index}.name`}
                      label={index === 0 ? "Item" : undefined}
                      placeholder="Carbon cleaner"
                    />
                  </div>
                  <div className="flex-1">
                    <ControlledInput
                      name={`items.${index}.cost`}
                      label={index === 0 ? "Cost (৳)" : undefined}
                      type="number"
                      step="0.01"
                      placeholder="300"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove item"
                    className="mb-2 grid size-8 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                    onClick={() => itemsFA.remove(index)}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => itemsFA.append({ name: "", cost: "" })}
              >
                <Plus className="size-4" />
                Add item
              </Button>
            </div>
          )}

          {/* ── recommendations — useFieldArray sub-editor (D5) ── */}
          <div className="space-y-2">
            <div className="text-xs text-foreground/70">Recommendations</div>
            {recsFA.fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-2 border-b border-border/60 pb-3 last:border-b-0"
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <ControlledInput
                      name={`recommendations.${index}.text`}
                      label={index === 0 ? "Recommendation" : undefined}
                      placeholder="Change air filter next service"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove recommendation"
                    className="mb-2 grid size-8 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                    onClick={() => recsFA.remove(index)}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <ControlledDateSelect
                  name={`recommendations.${index}.targetDate`}
                  label="Target date (optional)"
                  placeholder="Select target date"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                recsFA.append({ text: "", targetDate: null, done: false })
              }
            >
              <Plus className="size-4" />
              Add recommendation
            </Button>
          </div>

          <ControlledTextArea
            name="notes"
            label="Notes (optional)"
            placeholder="Any notes..."
            rows={3}
          />

          {completed && (
            <ControlledDateSelect
              name="nextServiceDue"
              label="Next service due (optional)"
              placeholder="Schedule the next visit"
            />
          )}

          <FormActionButtons
            isEditMode={isEditMode}
            isPending={isPending}
            createText={completed ? "Save service" : "Schedule service"}
          />
        </form>
      </FormProvider>
    </BaseModal>
  );
}
