import { BrandMark } from "@/components/layout/AppShell";
import { ReactNode } from "react";

type TAuthLayoutProps = {
  heading: string;
  lede: string;
  children: ReactNode;
};

/** Split auth screen: form column + (desktop) pitch panel — Nocturne design. */
export default function AuthLayout({ heading, lede, children }: TAuthLayoutProps) {
  return (
    <div className="flex min-h-dvh bg-background bg-ground text-foreground">
      <div className="flex w-full flex-col justify-center gap-[22px] px-5 py-6 lg:w-[480px] lg:shrink-0 lg:px-16 lg:py-14">
        <div className="flex items-center gap-2">
          <BrandMark />
          <span className="text-base font-medium">Bike Log</span>
        </div>
        <div>
          <h1 className="m-0 text-[26px] font-medium tracking-[-0.02em]">
            {heading}
          </h1>
          <p className="m-0 mt-1.5 text-[13.5px] text-muted-foreground">
            {lede}
          </p>
        </div>
        {children}
      </div>

      <div className="hidden flex-1 flex-col justify-end gap-3.5 border-l border-border bg-[radial-gradient(80%_60%_at_30%_100%,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_70%)] p-[72px] lg:flex">
        <div className="max-w-[560px] text-[40px] leading-[1.1] font-medium tracking-[-0.025em]">
          Every fill-up, service and taka — logged per bike.
        </div>
        <div className="max-w-[460px] text-sm text-muted-foreground">
          Exact km/l from full-tank periods, reminders from your service
          intervals, and an assistant that has read your owner’s manual.
        </div>
      </div>
    </div>
  );
}
