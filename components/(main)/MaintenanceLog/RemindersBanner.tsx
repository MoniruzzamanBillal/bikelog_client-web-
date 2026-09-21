"use client";

import { useFetchData } from "@/hooks/useApi";
import { AlertTriangle, Clock } from "lucide-react";
import { TReminder } from "./type/maintenance-log.types";
import { TMaintenanceType } from "../SettingsCatalog/type/maintenance-type.types";

function getTypeName(
  maintenanceType: TReminder["maintenanceType"],
  maintenanceTypes: TMaintenanceType[],
): string {
  if (typeof maintenanceType === "object" && maintenanceType?.name) {
    return maintenanceType.name;
  }
  if (typeof maintenanceType === "string") {
    const match = maintenanceTypes.find((mt) => mt._id === maintenanceType);
    if (match) return match.name;
  }
  return "Maintenance";
}

export default function RemindersBanner({ bikeId }: { bikeId: string }) {
  const { data, isLoading } = useFetchData<{ reminders: TReminder[] }>(
    ["reminders", bikeId],
    `/bikes/${bikeId}/reminders`,
  );
  const { data: mtData } = useFetchData<TMaintenanceType[]>(
    ["maintenanceTypes"],
    "/maintenance-types",
  );
  const reminders = data?.data?.reminders ?? [];
  const maintenanceTypes = mtData?.data ?? [];

  if (isLoading) return null;
  if (reminders.length === 0) return null;

  return (
    <div className="space-y-2">
      {reminders.map((r, i) => {
        const isOverdue = r.status === "overdue";
        const typeKey =
          typeof r.maintenanceType === "string"
            ? r.maintenanceType
            : r.maintenanceType._id;
        return (
          <div
            key={`${typeKey}-${i}`}
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
              <p className="font-medium">
                {getTypeName(r.maintenanceType, maintenanceTypes)}
              </p>
              <p className="mt-1 opacity-80">
                {r.kmRemaining !== undefined
                  ? isOverdue
                    ? `Overdue by ${Math.abs(r.kmRemaining).toLocaleString()} km`
                    : `Due in ${r.kmRemaining.toLocaleString()} km`
                  : r.daysRemaining !== undefined
                    ? isOverdue
                      ? `Overdue by ${Math.abs(r.daysRemaining)} days`
                      : `Due in ${r.daysRemaining} days`
                    : isOverdue
                      ? "Overdue"
                      : "Upcoming"}
              </p>
              {r.kmRemaining !== undefined && r.daysRemaining !== undefined && (
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
