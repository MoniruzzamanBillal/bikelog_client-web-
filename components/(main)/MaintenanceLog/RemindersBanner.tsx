"use client";

import { useFetchData } from "@/hooks/useApi";
import { AlertTriangle, Clock } from "lucide-react";
import { TReminder } from "./type/maintenance-log.types";

export default function RemindersBanner({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<{ reminders: TReminder[] }>(
    ["reminders", bikeId],
    `/bikes/${bikeId}/reminders`,
  );
  const reminders = data?.data?.reminders ?? [];

  if (isLoading) return null;
  if (reminders.length === 0) return null;

  return (
    <div className="space-y-2">
      {reminders.map((r, i) => {
        const isOverdue = r.status === "overdue";
        return (
          <div
            key={`${r.maintenanceType._id}-${i}`}
            className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
              isOverdue
                ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
            }`}
          >
            {isOverdue ? (
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            ) : (
              <Clock className="mt-0.5 size-5 shrink-0" />
            )}
            <div>
              <p className="font-medium">{r.maintenanceType.name}</p>
              <p className="mt-1 opacity-80">
                {isOverdue
                  ? `Overdue by ${Math.abs(r.kmRemaining).toLocaleString()} km`
                  : `Due in ${r.kmRemaining.toLocaleString()} km`}
              </p>
              {r.daysRemaining !== undefined && (
                <p className="opacity-70 text-xs">
                  {isOverdue
                    ? `${Math.abs(r.daysRemaining)} days overdue`
                    : `${r.daysRemaining} days remaining`}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
