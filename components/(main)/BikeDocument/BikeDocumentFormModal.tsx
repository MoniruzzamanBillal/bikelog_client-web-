"use client";

import BaseModal from "@/components/shared/Modal/BaseModal";
import FormActionButtons from "@/components/shared/Modal/FormActionButtons";
import ControlledDateSelect from "@/components/shared/input/ControlledDateSelect";
import ControlledInput from "@/components/shared/input/ControlledInput";
import ControlledTextArea from "@/components/shared/input/ControlledTextArea";
import { usePatch, usePost } from "@/hooks/useApi";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  bikeDocumentSchema,
  TBikeDocumentFormType,
} from "./schema/bike-document.schema";
import {
  TBikeDocument,
  TCreateBikeDocumentPayload,
} from "./type/bike-document.types";

type TBikeDocumentFormModalProps = {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  document?: TBikeDocument;
};

export default function BikeDocumentFormModal({
  open,
  onClose,
  bikeId,
  document,
}: TBikeDocumentFormModalProps) {
  const isEditMode = !!document;

  const { mutateAsync, isPending: isCreating } = usePost([
    ["bikeDocuments", bikeId],
  ]);

  const { mutateAsync: updateMutation, isPending: isUpdating } = usePatch([
    ["bikeDocuments", bikeId],
  ]);

  const methods = useForm<TBikeDocumentFormType>({
    resolver: zodResolver(bikeDocumentSchema),
    defaultValues: {
      title: document?.title ?? "",
      description: document?.description ?? "",
      expiryDate: document?.expiryDate
        ? new Date(document.expiryDate)
        : undefined,
    },
  });

  const isPending = isCreating || isUpdating;

  const onSubmit = async (data: TBikeDocumentFormType) => {
    try {
      const basePayload: TCreateBikeDocumentPayload = {
        title: data.title,
        description: data.description || undefined,
        expiryDate: data.expiryDate?.toISOString(),
      };

      if (isEditMode) {
        const result = await updateMutation({
          url: `/bikes/${bikeId}/documents/${document?._id}`,
          payload: basePayload as unknown as Record<string, unknown>,
        });

        if (result?.success) {
          toast.success("Document updated successfully");
        }
      } else {
        const result = await mutateAsync({
          url: `/bikes/${bikeId}/documents`,
          payload: basePayload as unknown as Record<string, unknown>,
        });

        if (result?.success) {
          toast.success("Document added successfully");
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
      title={isEditMode ? "Edit Document" : "Add Document"}
    >
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
          <ControlledInput
            name="title"
            label="Title"
            placeholder="e.g., Bike Registration Paper"
            isRequired
          />

          <ControlledTextArea
            name="description"
            label="Description (optional)"
            placeholder="Any extra detail about this document..."
            rows={3}
          />

          <ControlledDateSelect
            name="expiryDate"
            label="Expiry Date (optional)"
            placeholder="Select expiry date"
          />

          <FormActionButtons isEditMode={isEditMode} isPending={isPending} />
        </form>
      </FormProvider>
    </BaseModal>
  );
}
