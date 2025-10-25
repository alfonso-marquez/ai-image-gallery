"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client"; // <-- persistent instance

type UserContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
};

const UserContext = createContext<UserContextType>({
    user: null,
    session: null,
    loading: true,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        let active = true;

        const init = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) console.error("Error fetching session:", error);
            if (active) {
                setSession(data.session);
                setUser(data.session?.user ?? null);
                setLoading(false);
            }
        };

        init();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (active) {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        });

        return () => {
            active = false;
            listener.subscription.unsubscribe(); // ✅ correct cleanup
        };
    }, []);

    return (
        <UserContext.Provider value={{ user, session, loading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
