"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

export type LoginResponse = {
  error?: Record<string, string[]>;
};

const loginSchema = z.object({
  email: z.email({ pattern: z.regexes.email }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function login(formData: FormData): Promise<LoginResponse> {
  const supabase = await createClient();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    // Return validation errors to the form (no redirect)
    const fieldErrors: Record<string, string[]> = {};

    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as string;
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(issue.message);
    });
    return { error: fieldErrors };
  }
  const { email, password } = parsed.data;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error: {
        general: [error.message],
      },
    };
  }

  revalidatePath("/", "layout");
  return {};
}
