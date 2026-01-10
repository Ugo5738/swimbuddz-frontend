"use client";

import { supabase } from "@/lib/auth";
import { ChevronRight, LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/community", label: "Community" },
    { href: "/club", label: "Club" },
    { href: "/academy", label: "Academy" },
    { href: "/sessions-and-events", label: "Sessions & Events" },
    { href: "/store", label: "Shop" },
    { href: "/gallery", label: "Gallery" },
];

export function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const [session, setSession] = useState<any>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

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

    // Track scroll for sticky header styling
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setMobileMenuOpen(false);
        router.push("/login");
        router.refresh();
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname?.startsWith(href);
    };

    return (
        <header
            className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
                ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100'
                : 'bg-white border-b border-slate-200'
                }`}
            role="banner"
        >
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <img
                        src="/logo.png"
                        alt="SwimBuddz Logo"
                        className="h-9 w-auto md:h-11 transition-transform group-hover:scale-105"
                    />
                    <span className="text-xl font-bold tracking-tight text-cyan-700 md:text-2xl">
                        SwimBuddz
                    </span>
                </Link>

                {/* Mobile menu button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2.5 rounded-xl text-slate-600 hover:text-cyan-700 hover:bg-slate-100 transition-colors"
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`relative px-3 py-2 rounded-lg transition-colors ${isActive(link.href)
                                ? 'text-cyan-700 bg-cyan-50'
                                : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-50'
                                }`}
                        >
                            {link.label}
                            {isActive(link.href) && (
                                <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-cyan-500 rounded-full" />
                            )}
                        </Link>
                    ))}

                    {/* Auth Actions */}
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                        {session ? (
                            <>
                                <Link
                                    href="/account"
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-medium hover:from-cyan-500 hover:to-cyan-400 transition-all hover:shadow-lg hover:shadow-cyan-500/25"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/account/profile"
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${isActive('/profile')
                                        ? 'text-cyan-700 bg-cyan-50'
                                        : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <User className="h-4 w-4" />
                                    Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/coach/apply"
                                    className="px-3 py-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors font-medium"
                                >
                                    Become a Coach
                                </Link>
                                <Link
                                    href="/login"
                                    className="px-3 py-2 rounded-lg text-cyan-700 hover:bg-cyan-50 transition-colors"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="rounded-full bg-gradient-to-r from-cyan-600 to-cyan-500 px-5 py-2.5 text-white font-semibold hover:from-cyan-500 hover:to-cyan-400 transition-all hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105"
                                >
                                    Join
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            </div>

            {/* Mobile Navigation - Slide down */}
            <div
                className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <nav className="border-t bg-white px-4 py-4">
                    <div className="flex flex-col gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={closeMobileMenu}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${isActive(link.href)
                                    ? 'text-cyan-700 bg-cyan-50 font-semibold'
                                    : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-50'
                                    }`}
                            >
                                {link.label}
                                <ChevronRight className="h-4 w-4 opacity-50" />
                            </Link>
                        ))}

                        {/* Auth Actions */}
                        <div className="border-t border-slate-100 mt-2 pt-2">
                            {session ? (
                                <>
                                    <Link
                                        href="/account"
                                        onClick={closeMobileMenu}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold mb-2"
                                    >
                                        <LayoutDashboard className="h-5 w-5" />
                                        Go to Dashboard
                                    </Link>
                                    <Link
                                        href="/account/profile"
                                        onClick={closeMobileMenu}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive('/profile')
                                            ? 'text-cyan-700 bg-cyan-50 font-semibold'
                                            : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        <User className="h-5 w-5" />
                                        Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="h-5 w-5" />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/coach/apply"
                                        onClick={closeMobileMenu}
                                        className="block px-4 py-3 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors font-medium"
                                    >
                                        🏊‍♂️ Become a Coach
                                    </Link>
                                    <Link
                                        href="/login"
                                        onClick={closeMobileMenu}
                                        className="block px-4 py-3 rounded-xl text-cyan-700 hover:bg-cyan-50 transition-colors"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href="/register"
                                        onClick={closeMobileMenu}
                                        className="block mt-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-3.5 text-center text-white font-semibold hover:from-cyan-500 hover:to-cyan-400 transition-colors"
                                    >
                                        Join SwimBuddz
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    );
}
