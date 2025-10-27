import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative flex min-h-[calc(100vh-8rem)] items-center">
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div className="mx-auto h-64 w-11/12 -translate-y-4 rounded-full bg-linear-to-tr from-indigo-400 via-sky-400 to-emerald-400 opacity-25 dark:opacity-20 sm:h-96 sm:w-5/6" />
      </div>

      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="text-center">
          <p className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground">
            AI Image Gallery
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Turn uploads into insights
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Upload photos and instantly get AI‑generated tags, a descriptive
            summary, and the top three dominant colors.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user && (
              <Button asChild size="lg">
                <Link href="/gallery">Open your gallery</Link>
              </Button>
            )}
            {user ? (
              <Button asChild size="lg" variant="outline">
                <Link href="/profile">View profile</Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in to get started</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Quick value props */}
        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-background p-4 text-left">
            <p className="text-sm font-medium">Smart tags</p>
            <p className="mt-1 text-sm text-muted-foreground">
              5–10 labels from Amazon Rekognition.
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4 text-left">
            <p className="text-sm font-medium">Clean descriptions</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Two concise sentences via OpenAI/Bedrock.
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4 text-left">
            <p className="text-sm font-medium">Dominant colors</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Top 3 hex colors.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
