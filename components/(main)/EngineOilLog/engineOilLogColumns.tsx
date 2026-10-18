import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import EngineOilReceiptCell from "./EngineOilReceiptCell";
import EngineOilRowActions from "./EngineOilRowActions";
import { getOilName, TEngineOilLog } from "./type/engine-oil-log.types";

const money = (n: number) =>
  n?.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const engineOilLogColumns = ({
  onEdit,
  onDelete,
}: {
  onEdit: (data: TEngineOilLog) => void;
  onDelete: (data: TEngineOilLog) => void;
}): ColumnDef<TEngineOilLog>[] => [
  {
    accessorKey: "changeDate",
    header: "Date",
    cell: ({ row }) =>
      format(new Date(row?.getValue("changeDate") as string), "dd MMM yyyy"),
  },
  {
    accessorKey: "odometerReading",
    header: "Odometer",
    meta: { align: "right" },
    cell: ({ row }) =>
      `${(row?.getValue("odometerReading") as number)?.toLocaleString()} km`,
  },
  {
    id: "oil",
    header: "Oil",
    cell: ({ row }) => (
      <span className="block max-w-44 truncate">
        {getOilName(row?.original?.oilType, "—")}
      </span>
    ),
  },
  {
    accessorKey: "intervalKmUsed",
    header: "Interval",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row?.original?.intervalKmUsed != null
          ? `${row?.original?.intervalKmUsed?.toLocaleString()} km`
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "oilFilterChanged",
    header: "Filter",
    cell: ({ row }) =>
      (row?.getValue("oilFilterChanged") as boolean) ? (
        <StatusTag tone="success">Yes</StatusTag>
      ) : (
        <StatusTag>No</StatusTag>
      ),
  },
  {
    accessorKey: "cost",
    header: "Cost",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-medium">
        ৳{money(row?.getValue("cost") as number)}
      </span>
    ),
  },
  {
    id: "costPerKm",
    header: "৳/km",
    meta: { align: "right" },
    // ! server-computed (server spec 54 D12), `null` on the NEWEST change because its
    // ! period is still open — the status card above already says how far that oil has
    // ! run. Deliberately not filled in from `currentOdometer`, which would mix a settled
    // ! number and a moving one in the same column (§0 H-W12).
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row?.original?.costPerKm != null
          ? `৳${money(row?.original?.costPerKm)}`
          : "—"}
      </span>
    ),
  },
  {
    id: "receipt",
    header: "Receipt",
    cell: ({ row }) => <EngineOilReceiptCell log={row?.original} />,
  },
  {
    id: "actions",
    header: "",
    meta: { align: "right" },
    // ! Visible edit/delete icons, not a 3-dot dropdown (the developer's call, 2026-10-18).
    // ! Safe to drop the menu here precisely because there is no lock rule on an oil
    // ! change — nothing downstream closes a period over one, so neither action is ever
    // ! disabled and there is no footnote for a dropdown to carry.
    cell: ({ row }) => (
      <EngineOilRowActions
        log={row?.original}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
