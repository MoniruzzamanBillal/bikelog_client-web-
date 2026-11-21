"use client";

import BaseModal from "@/components/shared/Modal/BaseModal";
import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { Checkbox } from "@/components/ui/checkbox";
import { usePatch } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { itemsTotal, TServiceLog } from "./type/service-log.types";

const money = (n: number) =>
  n?.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });

const fmt = (s?: string | null): string => {
  if (!s) return "";
  const d = parse(s.slice(0, 10), "yyyy-MM-dd", new Date());
  return Number.isNaN(d.getTime()) ? "" : format(d, "d MMM");
};

type TProps = {
  open: boolean;
  onClose: () => void;
  bikeId: string;
  log: TServiceLog;
};

/**
 * The detail view a completed service opens (D11 / Open Question 2 — "a detailed modal").
 * Holds the line items, the notes, and the recommendation checklist with its tick-to-complete
 * (§G). The caller passes the LIVE list row looked up by `_id`, so a toggle's invalidation
 * re-renders the checklist here without closing the modal.
 */
export default function ServiceDetailModal({ open, onClose, bikeId, log }: TProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { mutateAsync: patch } = usePatch([
    ["serviceLogs", bikeId],
    ["serviceStatus", bikeId],
    ["bikes", bikeId],
    ["spending", bikeId],
    ["reminders", bikeId],
  ]);

  const items = (log?.items ?? []).filter((i) => i?.name);
  const recommendations = log?.recommendations ?? [];

  // ! §G / H-W-SVC-4: re-submit the WHOLE recommendations array with the one entry's `done`
  // ! flipped, every other entry and every `id` preserved.
  const toggle = async (id?: string) => {
    if (!id || togglingId) return; // a double-tap must not send two conflicting arrays
    setTogglingId(id);
    const next = recommendations.map((r) =>
      r?.id === id ? { ...r, done: !r?.done } : r,
    );
    try {
      await patch({
        url: `/bikes/${bikeId}/service-logs/${log?._id}`,
        payload: { recommendations: next },
      });
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Couldn't update recommendation");
    } finally {
      setTogglingId(null);
    }
  };

  const title =
    log?.serviceKind === "warranty"
      ? `Warranty service #${log?.warrantyNumber ?? ""}`.trim()
      : "Service";

  return (
    <BaseModal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{fmt(log?.serviceDate)}</span>
          {log?.centerType ? <StatusTag>{log?.centerType}</StatusTag> : null}
          {log?.serviceCenter ? <span>· {log?.serviceCenter}</span> : null}
        </div>

        {log?.odometerReading != null && (
          <div className="text-sm tabular-nums">
            Odometer{" "}
            <span className="font-medium">
              {log?.odometerReading?.toLocaleString()} km
            </span>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-foreground/70">
            <span>Line items</span>
            {items.length > 0 && (
              <span className="tabular-nums">৳{money(itemsTotal(items))}</span>
            )}
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Free service — no paid items.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {items.map((it, i) => (
                <li
                  key={it?.id ?? i}
                  className="flex items-center justify-between gap-3 text-sm tabular-nums"
                >
                  <span className="truncate">{it?.name}</span>
                  {it?.cost != null && <span>৳{money(Number(it?.cost))}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {recommendations.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-medium text-foreground/70">
              Recommendations
            </div>
            <ul className="flex flex-col gap-2">
              {recommendations.map((r, i) => (
                <li key={r?.id ?? i} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`rec-${r?.id ?? i}`}
                    checked={!!r?.done}
                    disabled={togglingId != null}
                    onCheckedChange={() => toggle(r?.id)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`rec-${r?.id ?? i}`}
                    className={cn(
                      "cursor-pointer text-sm leading-5",
                      r?.done && "text-muted-foreground line-through",
                    )}
                  >
                    {r?.text}
                    {r?.targetDate ? ` ~ ${fmt(r?.targetDate)}` : ""}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {log?.notes ? (
          <div>
            <div className="mb-1 text-xs font-medium text-foreground/70">Notes</div>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {log?.notes}
            </p>
          </div>
        ) : null}
      </div>
    </BaseModal>
  );
}
