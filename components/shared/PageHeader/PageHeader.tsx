"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { Fragment, ReactNode } from "react";

export type TCrumb = { label: string; href?: string };

type TPageHeaderProps = {
  title: string;
  crumbs?: TCrumb[];
  description?: ReactNode;
  actions?: ReactNode;
  // the mobile shell header already shows the page title
  showTitleOnMobile?: boolean;
  className?: string;
};

export default function PageHeader({
  title,
  crumbs,
  description,
  actions,
  showTitleOnMobile = false,
  className,
}: TPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 lg:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-1.5 hidden flex-wrap gap-1.5 text-xs text-muted-foreground lg:flex"
          >
            {crumbs.map((crumb, i) => (
              <Fragment key={`${crumb.label}-${i}`}>
                {i > 0 && <span>/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
        )}
        <h1
          className={cn(
            "m-0 text-[28px] leading-tight font-medium tracking-[-0.02em]",
            !showTitleOnMobile && "hidden lg:block",
          )}
        >
          {title}
        </h1>
        {description && (
          <div className="text-[13px] text-muted-foreground lg:mt-1">
            {description}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
