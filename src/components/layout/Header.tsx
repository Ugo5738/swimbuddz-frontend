"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";

export function Header() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        // Listen for changes
        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <header className="border-b bg-white" role="banner">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <img src="/logo.png" alt="SwimBuddz Logo" className="h-12 w-auto" />
                    <span className="text-2xl font-semibold tracking-tight text-cyan-700">SwimBuddz</span>
                </Link>
                <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600" aria-label="Main navigation">
                    <Link href="/" className="hover:text-cyan-700">
                        Home
                    </Link>
                    <Link href="/about" className="hover:text-cyan-700">
                        About
                    </Link>
                    <Link href="/guidelines" className="hover:text-cyan-700">
                        Guidelines
                    </Link>
                    <Link href="/announcements" className="hover:text-cyan-700">
                        Announcements
                    </Link>

                    {session ? (
                        <>
                            <Link href="/profile" className="hover:text-cyan-700">
                                Profile
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="text-cyan-700 hover:text-cyan-600"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="text-cyan-700 hover:text-cyan-600">
                                Login
                            </Link>
                            <Link
                                href="/register"
                                className="rounded-full bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-500"
                            >
                                Join
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
