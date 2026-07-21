"use client";

import AppShell from "@/components/layout/AppShell";
import { getToken, isTokenExpired } from "@/lib/tokenManager";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only session check must run post-hydration to avoid a server/client cookie-read mismatch
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return <AppShell>{children}</AppShell>;
}
