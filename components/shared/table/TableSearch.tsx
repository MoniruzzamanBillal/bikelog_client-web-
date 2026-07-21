"use client";

import { Search } from "lucide-react";

type TpageProps = {
  searchValue?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function TableSearch({
  searchValue,
  onSearchChange,
}: TpageProps) {
  return (
    <div className=" relative  w-[60%] sc-laptop:w-[320px]   ">
      <Search className="absolute left-3 top-2.5 text-surface-text-muted size-6 " />
      <input
        type="text"
        placeholder="Search..."
        onChange={onSearchChange}
        value={searchValue}
        className="w-full pl-11 pr-4 py-2.5 bg-transparent border border-surface-border rounded-[8px] text-surface-text placeholder:text-surface-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
      />
    </div>
  );
}
