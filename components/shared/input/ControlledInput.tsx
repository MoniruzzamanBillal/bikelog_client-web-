"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Controller, useFormContext } from "react-hook-form";

type TControlledInputProps = {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  className?: string;
  isRequired?: boolean;
  rightElement?: React.ReactNode;
  step?: string;
};

export default function ControlledInput({
  name,
  label,
  type = "text",
  placeholder,
  className,
  isRequired = false,
  rightElement,
  step,
}: TControlledInputProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className="space-y-1">
          {label && (
            <label className="text-sm font-medium">
              {label}
              {isRequired && <span className="ml-1 text-red-500">*</span>}
            </label>
          )}

          <div className="relative">
            <Input
              {...field}
              type={type}
              placeholder={placeholder}
              value={field.value ?? ""}
              step={step}
              className={cn(rightElement && "pr-10", className)}
            />
            {rightElement && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {rightElement}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error.message}</p>}
        </div>
      )}
    />
  );
}
