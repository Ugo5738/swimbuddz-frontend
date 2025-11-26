"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";
import { Menu, X } from "lucide-react";

export function Header() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        setMobileMenuOpen(false);
        router.push("/login");
        router.refresh();
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <header className="border-b bg-white" role="banner">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <img src="/logo.png" alt="SwimBuddz Logo" className="h-10 w-auto md:h-12" />
                    <span className="text-xl font-semibold tracking-tight text-cyan-700 md:text-2xl">
                        SwimBuddz
                    </span>
                </Link>

                {/* Mobile menu button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden text-slate-600 hover:text-cyan-700"
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex flex-wrap items-center gap-6 text-sm font-medium text-slate-600">
                    <Link href="/" className="hover:text-cyan-700">
                        Home
                    </Link>
                    <Link href="/about" className="hover:text-cyan-700">
                        About
                    </Link>
                    <Link href="/community" className="hover:text-cyan-700">
                        Community
                    </Link>
                    <Link href="/club" className="hover:text-cyan-700">
                        Club
                    </Link>
                    <Link href="/academy" className="hover:text-cyan-700">
                        Academy
                    </Link>
                    <Link href="/sessions-and-events" className="hover:text-cyan-700">
                        Sessions & Events
                    </Link>
                    <Link href="/gallery" className="hover:text-cyan-700">
                        Gallery
                    </Link>

                    {/* Auth Actions */}
                    {session ? (
                        <>
                            <Link href="/dashboard" className="hover:text-cyan-700">
                                Dashboard
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
                                className="rounded-full bg-cyan-600 px-5 py-2.5 text-white hover:bg-cyan-500 transition"
                            >
                                Join
                            </Link>
                        </>
                    )}
                </nav>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <nav className="border-t bg-white px-4 py-4 md:hidden">
                    <div className="flex flex-col gap-3 text-sm font-medium text-slate-600">
                        <Link href="/" onClick={closeMobileMenu} className="hover:text-cyan-700 py-2">
                            Home
                        </Link>
                        <Link href="/about" onClick={closeMobileMenu} className="hover:text-cyan-700 py-2">
                            About
                        </Link>
                        <Link href="/community" onClick={closeMobileMenu} className="hover:text-cyan-700 py-2">
                            Community
                        </Link>
                        <Link href="/club" onClick={closeMobileMenu} className="hover:text-cyan-700 py-2">
                            Club
                        </Link>
                        <Link href="/academy" onClick={closeMobileMenu} className="hover:text-cyan-700 py-2">
                            Academy
                        </Link>
                        <Link href="/sessions-and-events" onClick={closeMobileMenu} className="hover:text-cyan-700 py-2">
                            Sessions & Events
                        </Link>
                        <Link href="/gallery" onClick={closeMobileMenu} className="hover:text-cyan-700 py-2">
                            Gallery
                        </Link>

                        {/* Auth Actions */}
                        {session ? (
                            <>
                                <Link href="/dashboard" onClick={closeMobileMenu} className="hover:text-cyan-700 py-2 border-t pt-3 mt-2">
                                    Dashboard
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-left text-cyan-700 hover:text-cyan-600 py-2"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" onClick={closeMobileMenu} className="text-cyan-700 hover:text-cyan-600 py-2 border-t pt-3 mt-2">
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    onClick={closeMobileMenu}
                                    className="rounded-full bg-cyan-600 px-5 py-3 text-center text-white hover:bg-cyan-500 transition"
                                >
                                    Join
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            )}
        </header>
    );
}
