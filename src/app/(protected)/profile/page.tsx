import { createClient } from "@/utils/supabase/server";
import { Card } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <main className="flex min-h-[calc(100vh-8rem)] items-center">
            <div className="mx-auto w-full max-w-4xl px-6 py-12">
                <div className="mb-6">
                    <h1 className="text-3xl font-semibold">Profile</h1>
                    <p className="text-sm text-muted-foreground mt-1">View your account information</p>
                </div>

                <Card className="p-6">
                    <div className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Email</label>
                            <p className="mt-1 text-base">{user.email}</p>
                        </div>

                        {/* First Name */}
                        {user.user_metadata?.first_name && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">First Name</label>
                                <p className="mt-1 text-base">{user.user_metadata.first_name}</p>
                            </div>
                        )}

                        {/* Last Name */}
                        {user.user_metadata?.last_name && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                                <p className="mt-1 text-base">{user.user_metadata.last_name}</p>
                            </div>
                        )}

                        {/* User ID */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">User ID</label>
                            <p className="mt-1 text-sm font-mono text-muted-foreground break-all">{user.id}</p>
                        </div>

                        {/* Created At */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                            <p className="mt-1 text-base">
                                {new Date(user.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </main>
    );
}