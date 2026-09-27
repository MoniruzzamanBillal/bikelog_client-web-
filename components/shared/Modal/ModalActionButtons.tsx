"use client";

import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";

type TModalActionButtonsProps = {
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  isLoading?: boolean;
  variant?: "default" | "destructive";
};

export default function ModalActionButtons({
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  isLoading = false,
  variant = "default",
}: TModalActionButtonsProps) {
  return (
    <div className="mt-6 flex gap-2">
      <DialogClose asChild className="flex-1">
        <Button
          variant="outline"
          className="h-10"
        >
          {cancelText}
        </Button>
      </DialogClose>

      <Button
        variant={variant}
        className="h-10 flex-1"
        onClick={onConfirm}
        disabled={isLoading}
      >
        {confirmText}
      </Button>
    </div>
  );
}
