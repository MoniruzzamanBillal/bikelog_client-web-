import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Controller, useFormContext } from "react-hook-form";

type Option = {
  label: string;
  value: string;
};

interface ControlledSelectFieldProps {
  name: string;
  options: Option[];
  placeholder?: string;
  description?: string;
  className?: string;
  label?: string;
  isRequired?: boolean;
  disabled?: boolean;
}

const ControlledSelectField: React.FC<ControlledSelectFieldProps> = ({
  name,
  options = [],
  placeholder,
  className,
  label,
  isRequired,
  disabled,
}) => {
  const { control } = useFormContext();

  const isEmpty = !options || options.length === 0;

  return (
    <div className="relative w-full">
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <div className="space-y-1">
            {label && (
              <label className="mb-1.5 block text-xs text-foreground/70">
                {label}
                {isRequired && <span className="ml-0.5 text-destructive">*</span>}
              </label>
            )}

            <Select
              onValueChange={field.onChange}
              value={field.value ?? ""}
              key={field?.value}
              disabled={disabled}
            >
              <SelectTrigger
                className={cn(
                  "h-10 w-full text-base md:text-sm",
                  error && "border-destructive",
                  className,
                )}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent position="popper">
                {isEmpty ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground text-center cursor-default">
                    No options available
                  </div>
                ) : (
                  options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))
                )}

                {/* {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))} */}
              </SelectContent>
            </Select>
            {error && error && (
              <div className="text-xs text-destructive mt-1">
                {error.message}
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
};

export default ControlledSelectField;
