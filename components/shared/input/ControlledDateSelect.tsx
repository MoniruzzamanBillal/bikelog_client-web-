"use client";

import { Controller, useFormContext } from "react-hook-form";
import DateSelect from "./DateSelect";

type TControlledDateSelectProps = {
  name: string;
  label?: string;

  isRequired?: boolean;
  placeholder?: string;
};

const ControlledDateSelect = ({
  name,
  label,

  isRequired = false,
  placeholder = "Select purchase date",
}: TControlledDateSelectProps) => {
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

          <DateSelect
            value={field?.value}
            onChange={(date) => field?.onChange(date)}
            mode="single"
            placeholder={placeholder}
          />

          {error && <p className="text-xs text-destructive">{error?.message}</p>}
        </div>
      )}
    />
  );
};

export default ControlledDateSelect;
