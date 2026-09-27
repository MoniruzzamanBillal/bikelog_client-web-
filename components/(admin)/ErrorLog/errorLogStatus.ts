import { TStatusTone } from "@/components/shared/StatusTag/StatusTag";

// 5xx = server fault, 401/403 = auth, everything else (validation, 404, 409) neutral
export const getStatusTone = (status: number): TStatusTone =>
  status >= 500
    ? "danger"
    : status === 401 || status === 403
      ? "warning"
      : "neutral";
