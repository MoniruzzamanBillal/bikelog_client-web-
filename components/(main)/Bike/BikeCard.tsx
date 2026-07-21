"use client";

import Link from "next/link";
import { TBike } from "./type/bike.types";

export default function BikeCard({ bike }: { bike: TBike }) {
  return (
    <Link
      href={`/bikes/${bike._id}`}
      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-surface-hover"
    >
      <p className="text-base font-semibold">{bike.nickname}</p>
      <p className="text-sm text-surface-text">
        {bike.brand} {bike.model}
      </p>
      <p className="mt-2 text-sm">
        Odometer: {bike.currentOdometer.toLocaleString()} km
      </p>
    </Link>
  );
}
