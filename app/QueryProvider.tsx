"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // ! Spec 30 §A: must be `useState(() => ...)`, not `new QueryClient()` in the render
  // ! body — the latter throws the whole cache away on any re-render of this boundary.
  // ! This is NOT itself the cross-tenant leak fix: under the App Router the root layout
  // ! does not re-render on `router.replace`, so the same instance survives logout→login
  // ! anyway. Don't mistake the instability for accidental mitigation — it has to be fixed
  // ! BEFORE `queryClient.clear()` (AppShell logout / LoginForm) can be relied on at all.
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
