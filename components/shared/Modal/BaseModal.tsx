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
          "p-0 gap-0 rounded-[8px] border border-table-border w-full max-h-[92vh] flex flex-col overflow-hidden bg-background",
          className,
        )}
      >
        {showDeleteIcon && (
          <div className="shrink-0 px-6 pt-6 bg-background">
            <DialogHeader>
              <DialogTitle className="size-12">
                <Trash2 className="size-12 text-rose-500" />
              </DialogTitle>
            </DialogHeader>
          </div>
        )}

        {title && (
          <div className="shrink-0 px-6 py-5 bg-background border-b border-table-border">
            <DialogHeader>
              <DialogTitle className="font-semibold text-[1.5rem] leading-[1.5rem]">
                {title}
              </DialogTitle>
            </DialogHeader>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
