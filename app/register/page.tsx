"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/feature/auth/AuthLayout";
import RegisterForm from "@/components/feature/auth/RegisterForm";
import { getToken } from "@/lib/tokenManager";

export default function RegisterPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only "already logged in" check must run post-hydration to avoid a server/client cookie-read mismatch
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <AuthLayout
      heading="Create your account"
      lede="Start logging your first bike in a minute."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
