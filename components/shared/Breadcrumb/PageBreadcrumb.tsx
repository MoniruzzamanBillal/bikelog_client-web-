"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type Tbreadcrumb = {
  href: string;
  label: string;
};

type TpageProps = {
  breadcrumbs: Tbreadcrumb[];
};

export default function PageBreadcrumb({ breadcrumbs }: TpageProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList className="flex items-center text-base  ">
        {breadcrumbs.map((item, index) => (
          <div key={index + 1} className=" flex items-center font-semibold">
            {index > 0 && (
              <BreadcrumbSeparator className="pr-3">
                <ChevronRight className="text-neutral-700 dark:text-neutral-100 size-4 " />
              </BreadcrumbSeparator>
            )}
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage className="leading-7  text-neutral-700 dark:text-neutral-100 text-sm">
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <Link
                  href={{
                    pathname: item.href,
                  }}
                  passHref
                >
                  <BreadcrumbLink>
                    <p className="text-sm text-red-500 hover:underline font-semibold">
                      {item.label}
                    </p>
                  </BreadcrumbLink>
                </Link>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
