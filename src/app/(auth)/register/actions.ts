"use server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

export type RegisterResponse = {
  error?: Record<string, string[]>;
  success?: boolean;
};

const registerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.email({ pattern: z.regexes.email }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

async function checkUserExists(email: string) {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) throw error;
  return data.users.some((u) => u.email === email);
}

export async function register(formData: FormData): Promise<RegisterResponse> {
  const supabase = await createClient();

  const parsed = registerSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
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
    return { success: false, error: fieldErrors };
  }
  const { first_name, last_name, email, password } = parsed.data;

  // Check if user already exists in Supabase
  const exists = await checkUserExists(email);
  if (exists) {
    return {
      success: false,
      error: {
        email: ["This email is already registered."],
      },
    };
  }

  // Create auth user in Supabase
  const { error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        first_name: first_name,
        last_name: last_name,
      },
    },
  });

  if (error) {
    if (error.message.includes("User already registered")) {
      return {
        error: {
          email: ["This email is already registered. Try logging in instead."],
        },
      };
    }

    return {
      error: {
        general: [error.message],
      },
    };
  }

  return { success: true };
  // revalidatePath("/", "layout");
  // redirect("/");
}
