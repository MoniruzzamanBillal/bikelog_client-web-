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
    <div className="flex gap-3 mt-6 justify-end">
      <DialogClose asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 bg-surface border border-neutral-700 rounded-[8px]"
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
