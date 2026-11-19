import { TCloudinaryImage } from "@/components/shared/type/image.types";

// Spec 44 — mirrors the server's `toApiShape` (bikelog_server spec 67).

export interface TServiceItem {
  id?: string; // server-minted; present on reads, omitted on brand-new rows
  name: string;
  cost?: number | null; // plain JSON number — Number()/!= null guard on read (H-W-SVC-7)
}

export interface TServiceRecommendation {
  id?: string;
  text: string;
  targetDate?: string | null; // date-only (H-W-SVC-6)
  targetOdometer?: number | null;
  done: boolean;
}

export interface TServiceLog {
  _id: string;
  bike: string;
  serviceKind: "warranty" | "regular";
  warrantyNumber?: number | null; // 1..5, only on warranty rows
  status: "upcoming" | "completed"; // READ-ONLY, server-derived from serviceDate (H-W-SVC-3)
  dueDate?: string | null; // date-only
  serviceDate?: string | null; // date-only; presence ⇒ completed
  odometerReading?: number | null;
  serviceCenter?: string | null;
  centerType?: "official" | "local" | null;
  items?: TServiceItem[] | null;
  recommendations?: TServiceRecommendation[] | null;
  notes?: string | null;
  serviceImage?: TCloudinaryImage; // receipt { url, publicId }
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// `GET /bikes/:bikeId/service-logs/status` — warranty progress, computed server-side on read.
// nextWarranty / nextService are OMITTED (never null) when absent, so presence is the test.
export interface TServiceStatus {
  warrantyTotal: 5;
  warrantyCompleted: number;
  warrantyLogged: number;
  warrantyVoidRisk: boolean;
  nextWarranty?: {
    number: number | null;
    dueDate: string;
    status: "upcoming" | "overdue";
  } | null;
  nextService?: { dueDate: string; status: "upcoming" | "overdue" } | null;
}

export interface TCreateServiceLogPayload {
  serviceKind: "warranty" | "regular";
  warrantyNumber?: number; // only if the rider overrode it (D6)
  dueDate?: string;
  serviceDate?: string; // sets completed (H-W-SVC-10)
  odometerReading?: number;
  serviceCenter?: string;
  centerType?: "official" | "local";
  items?: { id?: string; name: string; cost?: number }[];
  recommendations?: {
    id?: string;
    text: string;
    targetDate?: string;
    targetOdometer?: number;
    done: boolean;
  }[];
  notes?: string;
}

export interface TServiceLogsApiResponse {
  result: TServiceLog[];
  meta: number;
}

/** Sum of a completed service's line-item costs, guarded against a stray null/string. */
export const itemsTotal = (items?: TServiceItem[] | null): number =>
  (items ?? []).reduce(
    (sum, i) => sum + (i?.cost != null && !isNaN(Number(i.cost)) ? Number(i.cost) : 0),
    0,
  );
