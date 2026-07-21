import TableActionMenu from "@/components/shared/table/TableActionMenu";
import { ColumnDef } from "@tanstack/react-table";
import { TFuelLog } from "./type/fuel-log.types";

export const fuelLogColumns = ({
  onEdit,
  onDelete,
}: {
  onEdit: (data: TFuelLog) => void;
  onDelete: (data: TFuelLog) => void;
}): ColumnDef<TFuelLog>[] => [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date") as string);
      return date.toLocaleDateString();
    },
  },
  {
    accessorKey: "odometerReading",
    header: "Odometer (km)",
    cell: ({ row }) => row.getValue("odometerReading") as number,
  },
  {
    accessorKey: "litersAdded",
    header: "Liters",
    cell: ({ row }) => (row.getValue("litersAdded") as number).toFixed(2),
  },
  {
    accessorKey: "totalCost",
    header: "Cost",
    cell: ({ row }) => `৳${(row.getValue("totalCost") as number).toFixed(2)}`,
  },
  {
    accessorKey: "isFullTank",
    header: "Full Tank",
    cell: ({ row }) => (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          (row.getValue("isFullTank") as boolean)
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        }`}
      >
        {(row.getValue("isFullTank") as boolean) ? "Yes" : "No"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <TableActionMenu
        rowData={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
        editLabel="Edit"
        deleteLabel="Delete"
      />
    ),
  },
];
