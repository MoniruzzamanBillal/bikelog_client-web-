"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

type TStaticPageBreadcrumbProps = {
  pageName: string;
};

export default function StaticPageBreadcrumb({
  pageName,
}: TStaticPageBreadcrumbProps) {
  return (
    <div className="flex items-center space-x-2  ">
      <Link
        href="/overview"
        className=" text-sm text-red-500 hover:underline font-semibold  "
      >
        Dashboard
      </Link>

      <span className="text-neutral-700 dark:text-neutral-100 ">
        <ChevronRight className=" size-4 " />
      </span>

      {/* Page Name */}
      <span className=" text-neutral-700 dark:text-neutral-100 text-sm   ">
        {pageName}
      </span>
    </div>
  );
}
