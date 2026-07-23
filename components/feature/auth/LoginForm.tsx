"use client";

import ControlledInput from "@/components/shared/input/ControlledInput";
import { usePost } from "@/hooks/useApi";
import { setToken } from "@/lib/tokenManager";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { loginSchema, TLoginForm } from "./auth.schema";

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const methods = useForm<TLoginForm>({ resolver: zodResolver(loginSchema) });
  const { mutateAsync: loginMutation, isPending } = usePost();

  const onSubmit: SubmitHandler<TLoginForm> = async (data) => {
    try {
      const result = await loginMutation({
        url: "/auth/login",
        payload: data,
      });
      if (result?.token) {
        toast.success("Logged in successfully");
        setToken(result.token);
        setTimeout(() => router.replace("/dashboard"), 100);
      }
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong!!", { duration: 2000 });
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
        <ControlledInput
          name="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          isRequired
        />
        <ControlledInput
          name="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          isRequired
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-muted-foreground"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          }
        />

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 cursor-pointer "
        >
          {isPending ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary underline">
          Register
        </Link>
      </p>
    </FormProvider>
  );
}
