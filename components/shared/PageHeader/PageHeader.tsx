"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import PageBreadcrumb from "../Breadcrumb/PageBreadcrumb";
import StaticPageBreadcrumb from "../Breadcrumb/StaticPageBreadcrumb";
import PrimaryButton from "../PrimaryButton/PrimaryButton";

type TpageProps = {
  pageName?: string;
  headerTitle?: string;
  btnText?: string;
  onClick?: () => void;
  showAddButton?: boolean;
};

export default function PageHeader({
  btnText,
  onClick,
  headerTitle,
  pageName,
  showAddButton = true,
}: TpageProps) {
  const pathname = usePathname();

  const pathSegments = pathname.split("/").filter((segment) => segment);

  const formatLabel = (segment: string) => {
    return segment
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const breadcrumbs = [
    { href: "/dashboard", label: "Dashboard" },
    ...pathSegments.map((segment: string, index: number) => {
      const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
      return { href, label: formatLabel(segment) };
    }),
  ];

  const breadcrumbsArray = breadcrumbs.filter((_, index) => index !== 1);

  // console.log("breadcrumbsArray = ", breadcrumbsArray);

  return (
    <div className=" flex justify-between items-center ">
      {/* left section  */}
      <div className="   ">
        {headerTitle && (
          <h1 className=" font-semibold text-2xl text-neutral-900 dark:text-neutral-100  mb-2 ">
            {headerTitle}
          </h1>
        )}

        {!pageName && <PageBreadcrumb breadcrumbs={breadcrumbsArray} />}

        {pageName && <StaticPageBreadcrumb pageName={pageName} />}
      </div>

      {/* right button section  */}
      {showAddButton && (
        <PrimaryButton onClick={onClick}>
          <span className="flex items-center justify-center text-neutral-50 size-5 ">
            <Plus />
          </span>

          <span> {btnText ?? "Add"} </span>
        </PrimaryButton>
      )}
    </div>
  );
}
