"use client";

import BaseModal from "@/components/shared/Modal/BaseModal";
import FormActionButtons from "@/components/shared/Modal/FormActionButtons";
import ControlledInput from "@/components/shared/input/ControlledInput";
import ControlledTextArea from "@/components/shared/input/ControlledTextArea";
import DateSelect from "@/components/shared/input/DateSelect";
import {
  Controller,
  FormProvider,
  SubmitHandler,
  useForm,
} from "react-hook-form";
import { toast } from "sonner";

import { usePatch, usePost } from "@/hooks/useApi";
import { TBikeIssue, TCreateBikeIssuePayload } from "./type/bike-issue.types";

type TBikeIssueFormValues = {
  title: string;
  description: string;
  dateReported: Date | undefined;
};

type TBikeIssueFormModalProps = {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  issue?: TBikeIssue;
};

export default function BikeIssueFormModal({
  open,
  onClose,
  bikeId,
  issue,
}: TBikeIssueFormModalProps) {
  const isEditMode = !!issue;

  const { mutateAsync, isPending: isCreating } = usePost([
    ["bikeIssues", bikeId],
  ]);

  const { mutateAsync: updateMutation, isPending: isUpdating } = usePatch([
    ["bikeIssues", bikeId],
  ]);

  const methods = useForm<TBikeIssueFormValues>({
    defaultValues: {
      title: issue?.title ?? "",
      description: issue?.description ?? "",
      dateReported: issue?.dateReported
        ? new Date(issue.dateReported)
        : new Date(),
    },
  });

  const isPending = isCreating || isUpdating;

  const onSubmit: SubmitHandler<TBikeIssueFormValues> = async (data) => {
    try {
      const basePayload: TCreateBikeIssuePayload = {
        title: data.title,
        description: data.description || undefined,
        dateReported: data.dateReported?.toISOString(),
      };

      if (isEditMode) {
        const result = await updateMutation({
          url: `/bikes/${bikeId}/issues/${issue?._id}`,
          payload: basePayload as unknown as Record<string, unknown>,
        });

        if (result?.success) {
          toast.success("Issue updated successfully");
        }
      } else {
        const result = await mutateAsync({
          url: `/bikes/${bikeId}/issues`,
          payload: basePayload as unknown as Record<string, unknown>,
        });

        if (result?.success) {
          toast.success("Issue reported successfully");
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
      title={isEditMode ? "Edit Issue" : "Report Issue"}
    >
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
          <ControlledInput
            name="title"
            label="Title"
            placeholder="e.g., Front brake squeaking"
            isRequired
          />

          <ControlledTextArea
            name="description"
            label="Description (optional)"
            placeholder="Describe the issue..."
            rows={3}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium">Date Reported</label>
            <Controller
              name="dateReported"
              control={methods.control}
              render={({ field }) => (
                <DateSelect
                  value={field.value}
                  onChange={(date) => field.onChange(date)}
                  mode="single"
                  placeholder="Select date"
                />
              )}
            />
          </div>

          <FormActionButtons isEditMode={isEditMode} isPending={isPending} />
        </form>
      </FormProvider>
    </BaseModal>
  );
}
