"use client";

import AppShell from "@/components/layout/AppShell";
import { getToken, hasUsableRefreshToken } from "@/lib/tokenManager";
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
    // ! Spec 32 §F: a PRESENCE check, not an expiry check. This used to bounce to /login
    // ! whenever the access token was expired, which with server spec 51's 15-minute token
    // ! would fire constantly — and needlessly, since the page's own queries will 401 and
    // ! `utils/axiosInstance.ts` refreshes and retries transparently (§B.0). Let the page
    // ! mount; only a session with neither a token nor a usable refresh token is no session.
    // ! Deliberately still synchronous with no network call, per `ai-workflow-rules.md`'s
    // ! protected-files rule for this gate and H-W5.
    if (!getToken() && !hasUsableRefreshToken()) {
      router?.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only session check must run post-hydration to avoid a server/client cookie-read mismatch
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return <AppShell>{children}</AppShell>;
}
