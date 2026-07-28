"use client";

import BaseModal from "./BaseModal";
import ModalActionButtons from "./ModalActionButtons";

type TConfirmDeleteModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description: string;
  isLoading?: boolean;
};

export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title = "Delete?",
  description,
  isLoading,
}: TConfirmDeleteModalProps) {
  return (
    <BaseModal open={open} onClose={onClose} title={title} showDeleteIcon>
      <p className="text-sm text-muted-foreground">{description}</p>
      <ModalActionButtons
        confirmText="Delete"
        onConfirm={onConfirm}
        isLoading={isLoading}
      />
    </BaseModal>
  );
}
