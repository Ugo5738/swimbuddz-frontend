"use client";

import { supabase } from "@/lib/auth";
import { ChevronDown, ChevronRight, LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Grouped navigation structure
const navGroups = [
    { href: "/", label: "Home", type: "link" as const },
    { href: "/about", label: "About", type: "link" as const },
    {
        label: "Programs",
        type: "dropdown" as const,
        items: [
            { href: "/community", label: "Community", description: "Join the network, connect with swimmers" },
            { href: "/club", label: "Club", description: "Structured training sessions & tracking" },
            { href: "/academy", label: "Academy", description: "Learn to swim with certified coaches" },
            { href: "/coaches", label: "Meet Our Coaches", description: "View coach profiles & expertise" },
        ]
    },
    { href: "/sessions-and-events", label: "Sessions", type: "link" as const },
    { href: "/tips", label: "Tips", type: "link" as const },
    // { href: "/store", label: "Shop", type: "link" as const },
    { href: "/gallery", label: "Gallery", type: "link" as const },
];

type NavItem = typeof navGroups[number];
type DropdownItem = { href: string; label: string; description: string };

// Check if user is admin by email
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const [session, setSession] = useState<any>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const mobileNavRef = useRef<HTMLElement>(null);

    // Determine if current user is admin
    const isAdmin = session?.user?.email && ADMIN_EMAIL &&
        session.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const dashboardUrl = isAdmin ? "/admin/dashboard" : "/account";

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
        setActiveDropdown(null);
    }, [pathname]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (dropdownRef.current?.contains(target)) return;
            if (mobileNavRef.current?.contains(target)) return;
            setActiveDropdown(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const isDropdownActive = (items: DropdownItem[]) => {
        return items.some(item => isActive(item.href));
    };

    const toggleDropdown = (label: string) => {
        setActiveDropdown(activeDropdown === label ? null : label);
    };

    const renderNavItem = (item: NavItem, isMobile: boolean = false) => {
        if (item.type === 'link') {
            return (
                <Link
                    key={item.href}
                    href={item.href}
                    onClick={isMobile ? closeMobileMenu : undefined}
                    className={`${isMobile
                        ? `flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${isActive(item.href)
                            ? 'text-cyan-700 bg-cyan-50 font-semibold'
                            : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-50'
                        }`
                        : `relative px-3 py-2.5 rounded-lg transition-colors min-h-[44px] flex items-center ${isActive(item.href)
                            ? 'text-cyan-700 bg-cyan-50'
                            : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-50'
                        }`
                        }`}
                >
                    {item.label}
                    {isMobile && <ChevronRight className="h-4 w-4 opacity-50" />}
                    {!isMobile && isActive(item.href) && (
                        <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-cyan-500 rounded-full" />
                    )}
                </Link>
            );
        }

        // Dropdown
        if (item.type === 'dropdown') {
            const dropdownActive = isDropdownActive(item.items);

            if (isMobile) {
                return (
                    <div key={item.label} className="space-y-1">
                        <button
                            onClick={() => toggleDropdown(item.label)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${dropdownActive
                                ? 'text-cyan-700 bg-cyan-50 font-semibold'
                                : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-50'
                                }`}
                        >
                            {item.label}
                            <ChevronDown className={`h-4 w-4 transition-transform ${activeDropdown === item.label ? 'rotate-180' : ''
                                }`} />
                        </button>
                        {activeDropdown === item.label && (
                            <div className="pl-4 space-y-1">
                                {item.items.map((subItem) => (
                                    <Link
                                        key={subItem.href}
                                        href={subItem.href}
                                        onClick={(e) => {
                                            setMobileMenuOpen(false);
                                            setActiveDropdown(null);
                                        }}
                                        className={`block w-full text-left px-4 py-2.5 rounded-lg transition-colors ${isActive(subItem.href)
                                            ? 'text-cyan-700 bg-cyan-50 font-medium'
                                            : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        {subItem.label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                );
            }

            // Desktop dropdown
            return (
                <div key={item.label} className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => toggleDropdown(item.label)}
                        onMouseEnter={() => setActiveDropdown(item.label)}
                        className={`flex items-center gap-1 px-3 py-2.5 rounded-lg transition-colors min-h-[44px] ${dropdownActive || activeDropdown === item.label
                            ? 'text-cyan-700 bg-cyan-50'
                            : 'text-slate-600 hover:text-cyan-700 hover:bg-slate-50'
                            }`}
                    >
                        {item.label}
                        <ChevronDown className={`h-4 w-4 transition-transform ${activeDropdown === item.label ? 'rotate-180' : ''
                            }`} />
                    </button>

                    {activeDropdown === item.label && (
                        <div
                            className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50"
                            onMouseLeave={() => setActiveDropdown(null)}
                        >
                            {item.items.map((subItem) => (
                                <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    className={`block px-4 py-3 transition-colors ${isActive(subItem.href)
                                        ? 'bg-cyan-50'
                                        : 'hover:bg-slate-50'
                                        }`}
                                >
                                    <span className={`font-medium ${isActive(subItem.href) ? 'text-cyan-700' : 'text-slate-900'
                                        }`}>
                                        {subItem.label}
                                    </span>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {subItem.description}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
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
                    className="md:hidden p-2 rounded-xl text-slate-600 hover:text-cyan-700 hover:bg-slate-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
                    {navGroups.map((item) => renderNavItem(item))}

                    {/* Auth Actions */}
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                        {session ? (
                            <>
                                <Link
                                    href={dashboardUrl}
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
                className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <nav ref={mobileNavRef} className="border-t bg-white px-4 py-4 max-h-[calc(80vh-1rem)] overflow-y-auto">
                    <div className="flex flex-col gap-1">
                        {navGroups.map((item) => renderNavItem(item, true))}

                        {/* Auth Actions */}
                        <div className="border-t border-slate-100 mt-2 pt-2">
                            {session ? (
                                <>
                                    <Link
                                        href={dashboardUrl}
                                        onClick={closeMobileMenu}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-semibold mb-2"
                                    >
                                        <LayoutDashboard className="h-5 w-5" />
                                        Dashboard
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
                                        Become a Coach
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
