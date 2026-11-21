import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { ColumnDef } from "@tanstack/react-table";
import { differenceInCalendarDays, format, parse } from "date-fns";
import ServiceReceiptCell from "./ServiceReceiptCell";
import ServiceRowActions from "./ServiceRowActions";
import { itemsTotal, TServiceLog } from "./type/service-log.types";

const money = (n: number) =>
  n?.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });

// date-only (H-W-SVC-6)
const fmt = (s: string | null | undefined, pattern: string): string => {
  if (!s) return "";
  const d = parse(s.slice(0, 10), "yyyy-MM-dd", new Date());
  return Number.isNaN(d.getTime()) ? "" : format(d, pattern);
};

const kindTag = (log: TServiceLog) =>
  log?.serviceKind === "warranty" ? (
    <StatusTag tone="accent">Warranty #{log?.warrantyNumber ?? "—"}</StatusTag>
  ) : (
    <StatusTag>Regular</StatusTag>
  );

const statusTag = (log: TServiceLog) => {
  if (log?.serviceDate != null) return <StatusTag tone="success">Done</StatusTag>;
  if (log?.dueDate) {
    const days = differenceInCalendarDays(
      parse(log.dueDate.slice(0, 10), "yyyy-MM-dd", new Date()),
      new Date(),
    );
    return days < 0 ? (
      <StatusTag tone="danger">Overdue</StatusTag>
    ) : (
      <StatusTag tone="warning">Upcoming</StatusTag>
    );
  }
  return <StatusTag tone="warning">Upcoming</StatusTag>;
};

export const serviceLogColumns = ({
  onDetails,
  onEdit,
  onDelete,
  onComplete,
}: {
  onDetails: (log: TServiceLog) => void;
  onEdit: (log: TServiceLog) => void;
  onDelete: (log: TServiceLog) => void;
  onComplete: (log: TServiceLog) => void;
}): ColumnDef<TServiceLog>[] => [
  {
    id: "date",
    header: "Date",
    cell: ({ row }) => {
      const log = row?.original;
      return log?.serviceDate != null
        ? fmt(log?.serviceDate, "dd MMM yyyy")
        : `Scheduled ~ ${fmt(log?.dueDate, "d MMM")}`;
    },
  },
  {
    id: "kind",
    header: "Kind",
    cell: ({ row }) => kindTag(row?.original),
  },
  {
    id: "centre",
    header: "Centre",
    cell: ({ row }) => {
      const log = row?.original;
      return (
        <span className="flex items-center gap-1.5">
          <span className="block max-w-40 truncate">
            {log?.serviceCenter ?? "—"}
          </span>
          {log?.centerType ? <StatusTag>{log?.centerType}</StatusTag> : null}
        </span>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => statusTag(row?.original),
  },
  {
    id: "cost",
    header: "Cost",
    meta: { align: "right" },
    cell: ({ row }) => {
      const log = row?.original;
      if (log?.serviceDate == null)
        return <span className="text-muted-foreground">—</span>;
      const items = (log?.items ?? []).filter((i) => i?.name);
      return items.length > 0 ? (
        <span className="font-medium tabular-nums">৳{money(itemsTotal(items))}</span>
      ) : (
        <span className="text-muted-foreground">Free</span>
      );
    },
  },
  {
    id: "receipt",
    header: "Receipt",
    cell: ({ row }) =>
      row?.original?.serviceDate != null ? (
        <ServiceReceiptCell log={row?.original} />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    header: "",
    meta: { align: "right" },
    cell: ({ row }) => (
      <ServiceRowActions
        log={row?.original}
        onDetails={onDetails}
        onEdit={onEdit}
        onDelete={onDelete}
        onComplete={onComplete}
      />
    ),
  },
];
