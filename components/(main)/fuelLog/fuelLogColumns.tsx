import StatusTag from "@/components/shared/StatusTag/StatusTag";
import TableActionMenu from "@/components/shared/table/TableActionMenu";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import FuelLogReceiptCell from "./FuelLogReceiptCell";
import { TFuelLog } from "./type/fuel-log.types";

const money = (n: number) =>
  n?.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fuelLogColumns = ({
  onEdit,
  onDelete,
  getLockNote,
  getMileage,
}: {
  onEdit: (data: TFuelLog) => void;
  onDelete: (data: TFuelLog) => void;
  // ! server rejects edit/delete for fills inside a closed mileage record
  getLockNote: (data: TFuelLog) => string | undefined;
  // ! closed-period km/l for a full-tank fill that closed a mileage record, else undefined
  getMileage: (data: TFuelLog) => number | undefined;
}): ColumnDef<TFuelLog>[] => [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) =>
      format(new Date(row?.getValue("date") as string), "dd MMM yyyy"),
  },
  {
    accessorKey: "odometerReading",
    header: "Odometer",
    meta: { align: "right" },
    cell: ({ row }) =>
      `${(row?.getValue("odometerReading") as number)?.toLocaleString()} km`,
  },
  {
    accessorKey: "litersAdded",
    header: "Liters",
    meta: { align: "right" },
    cell: ({ row }) => (row?.getValue("litersAdded") as number)?.toFixed(2),
  },
  {
    accessorKey: "pricePerLiter",
    header: "Price / L",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        ৳{money(row?.getValue("pricePerLiter") as number)}
      </span>
    ),
  },
  {
    accessorKey: "totalCost",
    header: "Cost",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-medium">
        ৳{money(row?.getValue("totalCost") as number)}
      </span>
    ),
  },
  {
    accessorKey: "isFullTank",
    header: "Tank",
    cell: ({ row }) =>
      (row?.getValue("isFullTank") as boolean) ? (
        <StatusTag tone="success">Full</StatusTag>
      ) : (
        <StatusTag>Partial</StatusTag>
      ),
  },
  {
    id: "mileage",
    header: "Mileage",
    meta: { align: "right" },
    // ! Mirrors the app's FuelLogCard: the accent km/l pill is the closed full-tank
    // ! period's exact mileage (only full-tank fills that closed a record have one), and
    // ! the muted line below is the per-fill `km on this tank · ৳/km` the server sends
    // ! (spec 57). The newest fill-up has an open period and no closing neighbour, so it
    // ! shows neither — an em dash stands in.
    cell: ({ row }) => {
      const log = row?.original;
      const kmPerLiter = getMileage(log);
      const hasPerFill = log?.kmOnThisFill != null && log?.costPerKm != null;

      if (kmPerLiter == null && !hasPerFill) {
        return <span className="text-muted-foreground">—</span>;
      }

      return (
        <div className="flex flex-col items-end gap-1 tabular-nums">
          {kmPerLiter != null && (
            <StatusTag tone="accent">{kmPerLiter.toFixed(1)} km/l</StatusTag>
          )}
          {hasPerFill && (
            <span className="text-[11px] whitespace-nowrap text-muted-foreground">
              {log?.kmOnThisFill?.toLocaleString()} km · ৳
              {log?.costPerKm?.toFixed(2)}/km
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "fuelStation",
    header: "Station",
    cell: ({ row }) => (
      <span className="block max-w-40 truncate text-muted-foreground">
        {row?.original?.fuelStation || "—"}
      </span>
    ),
  },
  {
    id: "receipt",
    header: "Receipt",
    cell: ({ row }) => <FuelLogReceiptCell fuelLog={row?.original} />,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const lockNote = getLockNote(row?.original);
      return (
        <TableActionMenu
          rowData={row?.original}
          onEdit={onEdit}
          onDelete={onDelete}
          disabled={!!lockNote}
          footnote={lockNote}
        />
      );
    },
  },
];
