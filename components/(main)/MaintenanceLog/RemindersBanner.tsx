"use client";

import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { useFetchData } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { TBike } from "../Bike/type/bike.types";
import { TMaintenanceType } from "../SettingsCatalog/type/maintenance-type.types";
import { TReminder } from "./type/maintenance-log.types";

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

const fmtDate = (d?: string) => (d ? format(new Date(d), "dd MMM yyyy") : "");

// primary line: how far off (or past) the service is
function getDistanceLine(r: TReminder, currentOdometer?: number): string {
  const isOverdue = r.status === "overdue";
  if (r.nextDueOdometer != null) {
    // ! server clamps kmRemaining to 0 once overdue — derive the real overshoot
    const km =
      isOverdue && currentOdometer != null
        ? currentOdometer - r.nextDueOdometer
        : (r.kmRemaining ?? 0);
    return isOverdue
      ? `${Math.abs(km).toLocaleString()} km past due`
      : `${km.toLocaleString()} km left`;
  }
  if (r.daysRemaining != null) {
    const days = Math.abs(r.daysRemaining);
    return isOverdue ? `${days} days past due` : `${days} days left`;
  }
  return isOverdue ? "Overdue" : "Upcoming";
}

function getDueLine(r: TReminder): string {
  const due =
    r.nextDueOdometer != null
      ? `Due at ${r.nextDueOdometer.toLocaleString()} km`
      : r.nextDueDate
        ? `Due ${fmtDate(r.nextDueDate)}`
        : "";
  const last = r.lastServiceDate ? `last done ${fmtDate(r.lastServiceDate)}` : "";
  return [due, last].filter(Boolean).join(" · ");
}

type TRemindersBannerProps = {
  bikeId: string;
  // hub shows a heading + link; the maintenance page doesn't
  showHeading?: boolean;
};

export default function RemindersBanner({
  bikeId,
  showHeading = false,
}: TRemindersBannerProps) {
  const { data, isLoading } = useFetchData<{ reminders: TReminder[] }>(
    ["reminders", bikeId],
    `/bikes/${bikeId}/reminders`,
  );
  const { data: mtData } = useFetchData<TMaintenanceType[]>(
    ["maintenanceTypes"],
    "/maintenance-types",
  );
  // same key as the bike hub — served from cache
  const { data: bikeData } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
  );
  const reminders = data?.data?.reminders ?? [];
  const maintenanceTypes = mtData?.data ?? [];
  const currentOdometer = bikeData?.data?.currentOdometer;

  if (isLoading) return null;
  if (reminders.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      {showHeading && (
        <div className="hidden items-baseline justify-between lg:flex">
          <h2 className="m-0 text-[15px] font-medium">Service reminders</h2>
          <Link
            href={`/bikes/${bikeId}/maintenance-logs`}
            className="text-[12.5px] text-primary hover:underline"
          >
            Maintenance logs →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-3">
        {reminders.map((r, i) => {
          const isOverdue = r.status === "overdue";
          const typeKey =
            typeof r.maintenanceType === "string"
              ? r.maintenanceType
              : r.maintenanceType._id;
          const Icon = isOverdue ? AlertTriangle : Clock;

          return (
            <div
              key={`${typeKey}-${i}`}
              className={cn(
                "flex items-center gap-3 rounded-[10px] bg-card px-3.5 py-[11px] lg:items-start lg:px-4 lg:py-3.5",
                isOverdue
                  ? "shadow-[0_0_0_1px_color-mix(in_srgb,var(--destructive)_40%,transparent)]"
                  : "shadow-[0_0_0_1px_color-mix(in_srgb,var(--warning)_35%,transparent)]",
              )}
            >
              <Icon
                className={cn(
                  "size-[18px] shrink-0 lg:mt-px",
                  isOverdue ? "text-destructive" : "text-warning",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-medium lg:text-sm">
                    {getTypeName(r.maintenanceType, maintenanceTypes)}
                  </span>
                  <StatusTag
                    tone={isOverdue ? "danger" : "warning"}
                    className="hidden lg:inline-flex"
                  >
                    {isOverdue ? "Overdue" : "Upcoming"}
                  </StatusTag>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums lg:mt-1 lg:text-[13px] lg:text-foreground">
                  {getDistanceLine(r, currentOdometer)}
                </div>
                <div className="mt-0.5 hidden text-xs text-muted-foreground tabular-nums lg:block">
                  {getDueLine(r)}
                </div>
              </div>
              <StatusTag
                tone={isOverdue ? "danger" : "warning"}
                className="lg:hidden"
              >
                {isOverdue ? "Overdue" : "Upcoming"}
              </StatusTag>
            </div>
          );
        })}
      </div>
    </section>
  );
}
