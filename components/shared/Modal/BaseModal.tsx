"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { ReactNode } from "react";

type TBaseDialogProps = {
  open: boolean;
  onClose: () => void;

  children: ReactNode;
  className?: string;
  title?: string;
  showDeleteIcon?: boolean;
};

export default function BaseModal({
  open,
  onClose,
  children,
  className,
  showDeleteIcon = false,
  title,
}: TBaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "p-0 gap-0 w-full max-h-[92vh] flex flex-col overflow-hidden",
          className,
        )}
      >
        {showDeleteIcon && (
          <div className="shrink-0 px-5 pt-5 sm:px-6 sm:pt-6">
            <span className="grid size-10 place-items-center rounded-[10px] text-destructive shadow-[0_0_0_1px_color-mix(in_srgb,var(--destructive)_50%,transparent)]">
              <Trash2 className="size-5" />
            </span>
          </div>
        )}

        {!title && <DialogTitle className="sr-only">Dialog</DialogTitle>}

        {title && (
          <div className="shrink-0 px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
            <DialogHeader>
              <DialogTitle className="pr-8 text-left text-xl leading-tight font-medium tracking-tight">
                {title}
              </DialogTitle>
            </DialogHeader>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-5 sm:px-6 sm:pb-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
