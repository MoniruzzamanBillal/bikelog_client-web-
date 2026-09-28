"use client";

import AuthLayout from "@/components/feature/auth/AuthLayout";
import LoginForm from "@/components/feature/auth/LoginForm";
import { getToken } from "@/lib/tokenManager";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router?.replace("/dashboard");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only "already logged in" check must run post-hydration to avoid a server/client cookie-read mismatch
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <AuthLayout
      heading="Welcome back"
      lede="Log in to your garage."
    >
      <LoginForm />
    </AuthLayout>
  );
}
