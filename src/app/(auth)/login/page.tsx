"use client";

import { useState } from "react";
import { login } from "./actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AccountLayout from "@/components/layouts/Account/AccountLayout";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function LoginPage() {
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result.error) {
      setErrors(result.error);
      setLoading(false);
      toast.error("Login Failed! Please try again.");
      return;
    } else {
      setLoading(false);
      toast.success("Login Successful!");
      router.refresh();
      router.push("/");
    }
  }

  return (
    <AccountLayout
      heading="Login"
      footerText="Don't have an account?"
      footerLinkText="Create Account"
      footerLinkUrl="/register"
    >
      <form onSubmit={handleSubmit} className="flex flex-col w-full gap-4">
        <div className="flex flex-col gap-2">
          <Label>Email</Label>
          <Input name="email" type="email" placeholder="Email" required />
          {errors?.email && (
            <p className="text-sm text-red-500">{errors.email[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Password</Label>
          <Input
            name="password"
            type="password"
            placeholder="Password"
            required
          />
          {errors?.password && (
            <p className="text-sm text-red-500">{errors.password[0]}</p>
          )}
        </div>

        {errors?.general && (
          <p className="text-sm text-red-500">{errors.general[0]}</p>
        )}

        <Button
          type="submit"
          className="w-full mt-2 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner />
              <span>Logging in</span>
            </>
          ) : (
            "Login"
          )}
        </Button>
      </form>
    </AccountLayout>
  );
}
