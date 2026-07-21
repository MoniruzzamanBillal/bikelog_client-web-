import { ChangeEvent, useState } from "react";
import { useDebounce } from "./useDebounce";

export const useSearchDebounce = (delay: number = 500) => {
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, delay);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  return {
    search,
    debouncedSearch,
    handleSearchChange,
    setSearch,
  };
};
