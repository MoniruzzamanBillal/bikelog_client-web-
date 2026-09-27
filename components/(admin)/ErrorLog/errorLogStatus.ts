export const getStatusBadgeClass = (status: number) =>
  status >= 500
    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
