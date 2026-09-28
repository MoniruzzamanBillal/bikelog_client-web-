"use client";

import { useDelete, useFetchData } from "@/hooks/useApi";
import { format } from "date-fns";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import BaseModal from "@/components/shared/Modal/BaseModal";
import ModalActionButtons from "@/components/shared/Modal/ModalActionButtons";
import PageHeader from "@/components/shared/PageHeader/PageHeader";
import StateCard from "@/components/shared/StateCard/StateCard";
import StatusTag from "@/components/shared/StatusTag/StatusTag";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  Droplet,
  FileText,
  Fuel,
  Gauge,
  LucideIcon,
  MoreHorizontal,
  Route,
  ShoppingBag,
  Sparkles,
  SquarePen,
  Trash2,
  Wallet,
  Wrench,
} from "lucide-react";
import FuelLogFormModal from "../../fuelLog/FuelLogFormModal";
import {
  TFuelLog,
  TFuelLogsApiResponse,
} from "../../fuelLog/type/fuel-log.types";
import AiMileageInsightCard from "../../Mileage/AiMileageInsightCard";
import {
  TLifetimeMileage,
  TMileageHistoryResponse,
} from "../../Mileage/type/mileage.types";
import RemindersBanner from "../../MaintenanceLog/RemindersBanner";
import { TSpendingSummary } from "../../Spending/type/spending.types";
import BikeFormModal from "../BikeFormModal";
import { TBike } from "../type/bike.types";

const taka = (n: number) =>
  `৳${n?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

// avg km/l for the stat tile: prefer the last ≤5 exact full-tank periods
function getAvgMileage(history?: TMileageHistoryResponse) {
  const exact = history?.exactRecords ?? [];
  if (exact?.length > 0) {
    const recent = [...exact]
      .sort(
        (a, b) =>
          new Date(b?.periodEndDate).getTime() -
          new Date(a?.periodEndDate).getTime(),
      )
      .slice(0, 5);
    const avg =
      recent?.reduce((sum, r) => sum + r?.mileageKmPerLiter, 0) / recent?.length;
    return {
      value: avg?.toFixed(1),
      hint: `Last ${recent?.length} full-tank period${recent?.length === 1 ? "" : "s"} · exact`,
    };
  }
  if (history?.approximate) {
    return {
      value: history?.approximate?.mileageKmPerLiter?.toFixed(1),
      hint: `Last ${history?.approximate?.basedOnFuelLogCount} fills · estimate`,
    };
  }
  return { value: "—", hint: "Log a full-tank fill to start" };
}

type TStat = {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  hint: string;
};

const HubStat = ({ stat }: { stat: TStat }) => {
  const Icon = stat?.icon;
  return (
    <div className="panel flex min-w-0 flex-col gap-1.5 p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="truncate">{stat?.label}</span>
      </div>
      <div className="truncate text-[26px] font-medium tracking-[-0.02em] tabular-nums">
        {stat?.value}
        {stat?.unit && (
          <span className="ml-1 text-[13px] font-normal tracking-normal text-muted-foreground">
            {stat?.unit}
          </span>
        )}
      </div>
      <div className="truncate text-xs text-muted-foreground">{stat?.hint}</div>
    </div>
  );
};

const BikeDetailPage = () => {
  const { bikeId } = useParams<{ bikeId: string }>();

  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logFuelOpen, setLogFuelOpen] = useState(false);

  const now = new Date();
  const targetMonth = format(now, "yyyy-MM");

  const { data, isLoading, isError } = useFetchData<TBike>(
    ["bikes", bikeId],
    `/bikes/${bikeId}`,
    { enabled: !!bikeId },
  );
  // the query keys below match the sub-pages, so their caches are shared
  const { data: historyData } = useFetchData<TMileageHistoryResponse>(
    ["mileage", "history", bikeId],
    `/bikes/${bikeId}/mileage`,
    { enabled: !!bikeId },
  );
  const { data: lifetimeData } = useFetchData<TLifetimeMileage>(
    ["mileage", "lifetime", bikeId],
    `/bikes/${bikeId}/mileage/lifetime`,
    { enabled: !!bikeId },
  );
  const { data: spendingData } = useFetchData<TSpendingSummary>(
    ["spending", bikeId, "month", targetMonth, ""],
    `/bikes/${bikeId}/spending-summary?period=month&targetMonth=${targetMonth}`,
    { enabled: !!bikeId },
  );
  const { data: recentFuelData } = useFetchData<TFuelLogsApiResponse>(
    ["fuelLogs", bikeId, "recent"],
    `/bikes/${bikeId}/fuel-logs?page=1&limit=5&sort=-date`,
    { enabled: !!bikeId },
  );

  const { mutateAsync: deleteBikeMutation, isPending: isDeleting } = useDelete([
    ["bikes"],
  ]);

  const handleDelete = async () => {
    try {
      const result = await deleteBikeMutation({ url: `/bikes/${bikeId}` });

      if (result?.success) {
        toast.success("Bike deleted successfully");
        router?.replace("/dashboard");
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong!!", { duration: 2000 });
    }
  };

  const bike = data?.data;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="hidden flex-col gap-2.5 lg:flex">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-7 w-60" />
        </div>
        <Skeleton className="h-[150px] rounded-[10px] lg:hidden" />
        <div className="hidden grid-cols-4 gap-3 lg:grid">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[104px] rounded-[10px]" />
          ))}
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-[58px] rounded-[10px] lg:h-[88px]" />
        ))}
        <Skeleton className="hidden h-60 rounded-[10px] lg:block" />
      </div>
    );
  }

  if (isError || !bike) {
    return (
      <StateCard
        variant="error"
        icon={AlertTriangle}
        title="Bike not found"
        message={
          <span className="font-sans">
            It may have been deleted, or it belongs to another account.
          </span>
        }
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ChevronLeft />
              Back to dashboard
            </Link>
          </Button>
        }
      />
    );
  }

  const avgMileage = getAvgMileage(historyData?.data);
  const lifetime = lifetimeData?.data;
  const monthSpend = spendingData?.data?.totalSpending ?? 0;
  const perDay = monthSpend / now?.getDate();
  const recentFuel: TFuelLog[] = recentFuelData?.data?.result ?? [];

  const stats: TStat[] = [
    {
      icon: Gauge,
      label: "Odometer",
      value: bike?.currentOdometer?.toLocaleString(),
      unit: "km",
      hint: `Since ${(bike?.initialOdometer ?? 0)?.toLocaleString()} km at purchase`,
    },
    {
      icon: Droplet,
      label: "Avg mileage",
      value: avgMileage?.value,
      unit: avgMileage?.value === "—" ? undefined : "km/l",
      hint: avgMileage?.hint,
    },
    {
      icon: Wallet,
      label: `Spent in ${format(now, "MMM yyyy")}`,
      value: taka(monthSpend),
      hint: `${taka(perDay)} per day so far`,
    },
    {
      icon: Route,
      label: "Lifetime distance",
      value: (lifetime?.totalDistanceKm ?? 0)?.toLocaleString(),
      unit: "km",
      hint: lifetime
        ? `${lifetime?.fuelLogCount} fill-ups · ${lifetime?.totalLitersConsumed?.toFixed(1)} L`
        : "No fill-ups yet",
    },
  ];

  const tiles: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "fuel-logs", label: "Fuel logs", icon: Fuel },
    { href: "mileage", label: "Mileage", icon: Gauge },
    { href: "maintenance-logs", label: "Maintenance", icon: Wrench },
    { href: "spending", label: "Spending", icon: Wallet },
    { href: "issues", label: "Issues", icon: AlertTriangle },
    { href: "accessories", label: "Accessories", icon: ShoppingBag },
    { href: "documents", label: "Documents", icon: FileText },
    { href: "manual", label: "Manual", icon: BookOpen },
    { href: "assistant", label: "AI Assistant", icon: Sparkles },
  ];

  const facts = [
    {
      label: "Purchased",
      value: bike?.purchaseDate
        ? format(new Date(bike?.purchaseDate), "dd MMM yyyy")
        : "—",
    },
    { label: "Fuel tank", value: `${bike?.fuelTankCapacityLiters} L` },
    {
      label: "Initial odometer",
      value: `${(bike?.initialOdometer ?? 0)?.toLocaleString()} km`,
    },
    {
      label: "Current odometer",
      value: `${bike?.currentOdometer?.toLocaleString()} km`,
    },
  ];

  return (
    <div className="flex flex-col gap-3 lg:gap-6">
      {/* ── desktop header ── */}
      <PageHeader
        className="hidden lg:flex"
        title={bike?.nickname}
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: bike?.nickname },
        ]}
        description={
          <span className="mt-1.5 flex items-center gap-2.5">
            <span>
              {bike?.brand} {bike?.model}
            </span>
            <StatusTag>{bike?.registrationNumber}</StatusTag>
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <SquarePen />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete
            </Button>
            <Button onClick={() => setLogFuelOpen(true)}>
              <Fuel />
              Log fuel
            </Button>
          </>
        }
      />

      {/* ── mobile odometer card ── */}
      <div className="panel flex flex-col gap-3 p-4 lg:hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
              Odometer
            </div>
            <div className="text-[30px] font-medium tracking-[-0.02em] tabular-nums">
              {bike?.currentOdometer?.toLocaleString()}
              <span className="ml-1 text-sm font-normal tracking-normal text-muted-foreground">
                km
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Bike actions"
              className="grid size-10 place-items-center rounded-lg text-muted-foreground shadow-sm outline-none hover:bg-surface-hover"
            >
              <MoreHorizontal className="size-[18px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onSelect={() => setLogFuelOpen(true)}>
                <Fuel />
                Log fuel
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <SquarePen />
                Edit bike
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 />
                Delete bike
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="rule-fade" />
        <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
          <div>
            <div className="text-muted-foreground">Avg mileage</div>
            <div className="mt-0.5 text-[15px]">
              {avgMileage?.value}
              {avgMileage?.value !== "—" && " km/l"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {format(now, "MMM")} spend
            </div>
            <div className="mt-0.5 text-[15px]">{taka(monthSpend)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Lifetime</div>
            <div className="mt-0.5 text-[15px]">
              {(lifetime?.totalDistanceKm ?? 0)?.toLocaleString()} km
            </div>
          </div>
        </div>
      </div>

      {/* ── desktop stat tiles ── */}
      <div className="hidden grid-cols-2 gap-3 lg:grid xl:grid-cols-4">
        {stats?.map((stat) => (
          <HubStat key={stat?.label} stat={stat} />
        ))}
      </div>

      <RemindersBanner bikeId={bikeId} showHeading />

      {/* ── mobile section tiles ── */}
      <div className="grid grid-cols-3 gap-2 lg:hidden">
        {tiles?.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={`/bikes/${bikeId}/${href}`}
            className="panel flex h-[76px] flex-col items-start justify-between p-3 transition-shadow hover:shadow-md"
          >
            <Icon className="size-[18px] text-primary" />
            <span className="text-[12.5px]">{label}</span>
          </Link>
        ))}
      </div>

      {/* ── desktop: recent fill-ups + insight/facts ── */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="panel flex min-w-0 flex-col gap-2 px-[18px] py-4">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-[15px] font-medium">Recent fill-ups</h2>
            <Link
              href={`/bikes/${bikeId}/fuel-logs`}
              className="text-[12.5px] text-primary hover:underline"
            >
              All fuel logs →
            </Link>
          </div>
          {recentFuel?.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No fill-ups logged yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] tabular-nums">
                <thead>
                  <tr className="row-fade">
                    {["Date", "Odometer", "Liters", "Cost", "Full tank"].map(
                      (h) => (
                        <th
                          key={h}
                          className="h-9 px-2 text-left text-[11px] font-normal tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase first:pl-0"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recentFuel?.map((f) => (
                    <tr key={f?._id} className="row-fade h-10">
                      <td className="px-2 pl-0 whitespace-nowrap">
                        {format(new Date(f?.date), "dd MMM yyyy")}
                      </td>
                      <td className="px-2 whitespace-nowrap">
                        {f?.odometerReading?.toLocaleString()} km
                      </td>
                      <td className="px-2">{f?.litersAdded?.toFixed(2)} L</td>
                      <td className="px-2 whitespace-nowrap">
                        ৳
                        {f?.totalCost?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td
                        className={cn(
                          "px-2",
                          f?.isFullTank
                            ? "text-success"
                            : "text-muted-foreground",
                        )}
                      >
                        {f?.isFullTank ? "Full" : "Partial"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <AiMileageInsightCard bikeId={bikeId} />
          <div className="panel grid grid-cols-2 gap-x-4 gap-y-2.5 px-[18px] py-4 text-[13px]">
            {facts?.map((f) => (
              <div key={f?.label}>
                <div className="text-xs text-muted-foreground">{f?.label}</div>
                <div className="tabular-nums">{f?.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editOpen && (
        <BikeFormModal open onClose={() => setEditOpen(false)} bike={bike} />
      )}

      {logFuelOpen && (
        <FuelLogFormModal
          open
          onClose={() => setLogFuelOpen(false)}
          bikeId={bikeId}
        />
      )}

      <BaseModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete bike?"
        showDeleteIcon
      >
        <p className="text-sm text-muted-foreground">
          This will permanently remove &quot;{bike?.nickname}&quot; and cannot be
          undone.
        </p>
        <ModalActionButtons
          confirmText="Delete"
          variant="destructive"
          onConfirm={handleDelete}
          isLoading={isDeleting}
        />
      </BaseModal>
    </div>
  );
};

export default BikeDetailPage;
