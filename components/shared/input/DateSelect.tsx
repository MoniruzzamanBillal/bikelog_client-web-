"use client";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarRange } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

type TDateSelectProps = {
  value?: Date | DateRange;
  onChange: (date: Date | DateRange | undefined) => void;
  mode?: "single" | "range";
  placeholder?: string;
};

export default function DateSelect({
  placeholder,
  value,
  onChange,
  mode = "single",
}: TDateSelectProps) {
  const [open, setOpen] = useState(false);

  const isRange = mode === "range";

  const formatDate = () => {
    if (!value) return placeholder ?? "Select Date";

    if (!isRange && value instanceof Date) {
      return value?.toLocaleDateString();
    }

    if (isRange && typeof value === "object" && "from" in value) {
      if (value?.from && value?.to) {
        return `${value?.from?.toLocaleDateString()} - ${value?.to?.toLocaleDateString()}`;
      }

      if (value?.from) {
        return value?.from?.toLocaleDateString();
      }
    }

    return placeholder ?? "Select Date";
  };

  const defaultMonth =
    value instanceof Date
      ? value
      : typeof value === "object" && value?.from
        ? value?.from
        : undefined;

  const handleSingleSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    onChange(range);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-10 w-full cursor-pointer items-center gap-x-2 rounded-lg border border-input bg-card px-2.5 text-left transition-colors hover:border-foreground/40">
        <div>
          <CalendarRange className="size-4 text-muted-foreground" />
        </div>

        <span className="text-sm text-foreground tabular-nums">
          {formatDate()}
        </span>
      </PopoverTrigger>

      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        {mode === "single" ? (
          <Calendar
            mode="single"
            selected={value as Date | undefined}
            onSelect={handleSingleSelect}
            defaultMonth={defaultMonth}
            captionLayout="dropdown"
            className="bg-popover"
          />
        ) : (
          <Calendar
            mode="range"
            selected={value as DateRange | undefined}
            onSelect={handleRangeSelect}
            defaultMonth={defaultMonth}
            captionLayout="dropdown"
            className="bg-popover"
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
