"use client";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Controller, useFormContext } from "react-hook-form";

type TControlledITextAreaProps = {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  className?: string;
  isRequired?: boolean;
  rows?: number;
};

export default function ControlledTextArea({
  name,
  label,

  placeholder,
  className,
  isRequired = false,
  rows = 4,
}: TControlledITextAreaProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div>
          {label && (
            <label className="mb-1.5 block text-xs text-foreground/70">
              {label}
              {isRequired && <span className="ml-0.5 text-destructive">*</span>}
            </label>
          )}

          <Textarea
            {...field}
            rows={rows}
            placeholder={placeholder}
            value={field?.value ?? ""}
            className={cn(className)}
          />

          {error && <p className="mt-1 text-xs text-destructive">{error?.message}</p>}
        </div>
      )}
    />
  );
}
