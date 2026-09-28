import StatusTag from "@/components/shared/StatusTag/StatusTag";
import TableActionMenu from "@/components/shared/table/TableActionMenu";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import FuelLogReceiptCell from "./FuelLogReceiptCell";
import { TFuelLog } from "./type/fuel-log.types";

const money = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fuelLogColumns = ({
  onEdit,
  onDelete,
  getLockNote,
}: {
  onEdit: (data: TFuelLog) => void;
  onDelete: (data: TFuelLog) => void;
  // ! server rejects edit/delete for fills inside a closed mileage record
  getLockNote: (data: TFuelLog) => string | undefined;
}): ColumnDef<TFuelLog>[] => [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) =>
      format(new Date(row.getValue("date") as string), "dd MMM yyyy"),
  },
  {
    accessorKey: "odometerReading",
    header: "Odometer",
    meta: { align: "right" },
    cell: ({ row }) =>
      `${(row.getValue("odometerReading") as number).toLocaleString()} km`,
  },
  {
    accessorKey: "litersAdded",
    header: "Liters",
    meta: { align: "right" },
    cell: ({ row }) => (row.getValue("litersAdded") as number).toFixed(2),
  },
  {
    accessorKey: "pricePerLiter",
    header: "Price / L",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        ৳{money(row.getValue("pricePerLiter") as number)}
      </span>
    ),
  },
  {
    accessorKey: "totalCost",
    header: "Cost",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-medium">
        ৳{money(row.getValue("totalCost") as number)}
      </span>
    ),
  },
  {
    accessorKey: "isFullTank",
    header: "Tank",
    cell: ({ row }) =>
      (row.getValue("isFullTank") as boolean) ? (
        <StatusTag tone="success">Full</StatusTag>
      ) : (
        <StatusTag>Partial</StatusTag>
      ),
  },
  {
    accessorKey: "fuelStation",
    header: "Station",
    cell: ({ row }) => (
      <span className="block max-w-40 truncate text-muted-foreground">
        {row.original.fuelStation || "—"}
      </span>
    ),
  },
  {
    id: "receipt",
    header: "Receipt",
    cell: ({ row }) => <FuelLogReceiptCell fuelLog={row.original} />,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const lockNote = getLockNote(row.original);
      return (
        <TableActionMenu
          rowData={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
          disabled={!!lockNote}
          footnote={lockNote}
        />
      );
    },
  },
];
