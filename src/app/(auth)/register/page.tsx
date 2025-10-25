"use client";

import { Label } from "@/components/ui/label";
import { register } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AccountLayout from "@/components/layouts/Account/AccountLayout";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";
import { toast } from "sonner";

export default function RegisterPage() {
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors(null);
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await register(formData);

      if (result.error) {
        setErrors(result.error);
        return;
      }

      toast.success("User Registration Successful!", {
        description: "Please check your email to confirm your account.",
      });

      setTimeout(() => router.push("/"), 4000);
    } catch (error) {
      if (process.env.NODE_ENV == "development") {
        console.error(error);
      }
      toast.error("User Registration Failed", {
        description: "User Registration Failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AccountLayout
      heading="Sign Up to Get Started"
      footerText="Already have an account?"
      footerLinkText="Login"
      footerLinkUrl="/login"
    >
      <form onSubmit={handleSubmit} className="flex flex-col w-full gap-4">
        <div className="flex w-full flex-col gap-2 mt-4">
          <Label>First Name</Label>
          <Input
            type="text"
            name="first_name"
            placeholder="First Name"
            required
          />
          {errors?.first_name && (
            <p className="text-sm text-red-500">{errors.first_name[0]}</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2  ">
          <Label>Last Name</Label>
          <Input
            type="text"
            name="last_name"
            placeholder="Last Name"
            required
          />
          {errors?.last_name && (
            <p className="text-sm text-red-500">{errors.last_name[0]}</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 mt-4">
          <Label>Email</Label>
          <Input type="email" name="email" placeholder="Email" required />
          {errors?.email && (
            <p className="text-sm text-red-500">{errors.email[0]}</p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2">
          <Label>Password</Label>
          <Input
            type="password"
            name="password"
            placeholder="Password"
            required
          />
          {errors?.password && (
            <p className="text-sm text-red-500">{errors.password[0]}</p>
          )}
        </div>

        {message && <p className="text-green-600 text-sm">{message}</p>}
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
              <span>Creating Account</span>
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </AccountLayout>
  );
}
