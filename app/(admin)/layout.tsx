"use client";

import AppShell from "@/components/layout/AppShell";
import { getToken, hasUsableRefreshToken } from "@/lib/tokenManager";
import { isAdminUser } from "@/lib/userRole";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // ! Spec 32 §F — same presence check as the `(main)` gate.
    if (!getToken() && !hasUsableRefreshToken()) {
      router?.replace("/login");
      return;
    }
    // ! Spec 32 H-W1: this reads the `userRole` claim off the access-token cookie, with no
    // ! request for the server to 401, so §B.0's reactive refresh cannot rescue it. It keeps
    // ! working for an admin returning after a week only because the access cookie is now
    // ! persistent (§C) and `jwt.decode` ignores `exp` — a stale token is still a perfectly
    // ! good claims carrier. Make that cookie session-scoped again and this silently starts
    // ! bouncing admins to /dashboard.
    if (!isAdminUser()) {
      router?.replace("/dashboard");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only session check must run post-hydration to avoid a server/client cookie-read mismatch
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return <AppShell>{children}</AppShell>;
}
