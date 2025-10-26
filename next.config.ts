import type { NextConfig } from "next";

// Derive the Supabase hostname more defensively so dev doesn't crash when envs are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_HOST_NAME;

if (!supabaseHostname && supabaseUrl) {
  try {
    supabaseHostname = new URL(supabaseUrl).hostname;
  } catch {
    // ignore parse errors; we'll omit remotePatterns below if we can't resolve a hostname
  }
}

const nextConfig: NextConfig = {
  images: supabaseHostname
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: supabaseHostname,
            port: "",
            pathname: "/storage/v1/object/public/**",
          },
        ],
      }
    : undefined,
};

export default nextConfig;
