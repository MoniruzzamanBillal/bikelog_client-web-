"use client";

import { Controller, useFormContext } from "react-hook-form";
import DateSelect from "./DateSelect";

type TControlledDateSelectProps = {
  name: string;
  label?: string;

  isRequired?: boolean;
};

const ControlledDateSelect = ({
  name,
  label,

  isRequired = false,
}: TControlledDateSelectProps) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div>
          {label && (
            <label className="text-sm font-medium">
              {label}
              {isRequired && <span className="ml-1 text-red-500">*</span>}
            </label>
          )}

          <DateSelect
            value={field.value}
            onChange={(date) => field.onChange(date)}
            mode="single"
            placeholder="Select purchase date"
          />

          {error && <p className="text-sm text-red-500">{error.message}</p>}
        </div>
      )}
    />
  );
};

export default ControlledDateSelect;
