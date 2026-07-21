"use client";

import { DateRange } from "react-day-picker";
import DateSelect from "../input/DateSelect";
import TableFilter, { TTableFilterGroup } from "./TableFilter";
import TableSearch from "./TableSearch";

type TpageProps = {
  activeTab?: string;

  tableFilterOption?: TTableFilterGroup[];
  filters?: Record<string, string>;

  setFilters?: (val: Record<string, string>) => void;

  showDateFilter?: boolean;
  selectedDate?: Date;
  setSelectedDate?: React.Dispatch<React.SetStateAction<Date | undefined>>;

  //
  searchValue?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function TableToolbar({
  activeTab,

  tableFilterOption,
  filters,
  setFilters,
  showDateFilter,
  selectedDate,
  setSelectedDate,
  searchValue,
  onSearchChange,
}: TpageProps) {
  const handleDateChange = (date: Date | DateRange | undefined) => {
    if (setSelectedDate) {
      if (date === undefined || date instanceof Date) {
        setSelectedDate(date);
      }
    }
  };

  return (
    <div className="  py-1.5 sc-laptop:py-3.5 px-3 bg-surface-secondary border border-surface-border  rounded-[8px] flex flex-col sc-laptop:flex-row gap-y-3 sc-laptop:gap-y-0  items-start sc-laptop:items-center overflow-auto ">
      <div className=" flex-1  flex justify-start ">
        <h1>left side </h1>
      </div>

      {/* right side  */}
      <div className=" flex-1 flex justify-start sc-laptop:justify-end items-center gap-x-4 w-full sc-laptop:w-auto   ">
        {/* input section  */}
        <TableSearch
          searchValue={searchValue}
          onSearchChange={onSearchChange}
        />

        {showDateFilter && (
          <DateSelect value={selectedDate} onChange={handleDateChange!} />
        )}

        {/* filter section  */}
        {tableFilterOption && filters && setFilters && (
          <TableFilter
            filters={tableFilterOption}
            value={filters}
            onChange={setFilters}
          />
        )}
      </div>
    </div>
  );
}
