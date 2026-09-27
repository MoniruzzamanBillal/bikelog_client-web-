"use client";

import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import PrimaryButton from "../PrimaryButton/PrimaryButton";

type FormActionButtonsProps = {
  isEditMode?: boolean;
  isPending?: boolean;
  editText?: string;
  createText?: string;
};

export default function FormActionButtons({
  isEditMode = false,
  isPending = false,
  editText = "Update",
  createText = "Add",
}: FormActionButtonsProps) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <DialogClose asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10"
        >
          Cancel
        </Button>
      </DialogClose>

      <PrimaryButton type="submit" disabled={isPending}>
        {isEditMode ? editText : createText}
      </PrimaryButton>
    </div>
  );
}
