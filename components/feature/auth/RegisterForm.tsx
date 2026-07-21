"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import ControlledInput from "@/components/shared/input/ControlledInput";
import { usePost } from "@/hooks/useApi";
import { registerSchema, TRegisterForm } from "./auth.schema";

export default function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const methods = useForm<TRegisterForm>({
    resolver: zodResolver(registerSchema),
  });
  const { mutateAsync: registerMutation, isPending } = usePost();

  const onSubmit: SubmitHandler<TRegisterForm> = async (data) => {
    try {
      await registerMutation({ url: "/auth/register", payload: data });
      toast.success("Registered successfully");
      setTimeout(() => router.replace("/login"), 100);
    } catch (error) {
      const message = (error as { message?: string })?.message;
      toast.error(message ?? "Something went wrong!!", { duration: 2000 });
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
        <ControlledInput name="name" label="Name" placeholder="Your name" isRequired />
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
          className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isPending ? "Registering..." : "Register"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary underline">
          Log in
        </Link>
      </p>
    </FormProvider>
  );
}
