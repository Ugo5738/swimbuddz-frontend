"use client";

import { useStoreCart } from "@/lib/storeCart";
import { ArrowLeft, Search, ShoppingCart, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

export function StoreHeader() {
  const { itemCount, isAuthenticated } = useStoreCart();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchValue.trim();
      if (q) {
        router.push(`/store?search=${encodeURIComponent(q)}`);
      } else {
        router.push("/store");
      }
      setSearchOpen(false);
    },
    [searchValue, router]
  );

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (!prev) {
        // Opening — focus after transition
        setTimeout(() => inputRef.current?.focus(), 150);
      }
      return !prev;
    });
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Back link + Logo + Nav */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/"
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-cyan-600 transition-colors"
              title="Back to SwimBuddz"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">SwimBuddz</span>
            </Link>
            <div className="w-px h-5 bg-slate-200 hidden sm:block" />
            <Link href="/store" className="flex items-center gap-2">
              <span className="text-xl">🏊</span>
              <span className="font-bold text-lg text-slate-900 hidden sm:inline">Store</span>
            </Link>
            <nav className="hidden md:flex items-center gap-5">
              <Link
                href="/store"
                className="text-sm text-slate-600 hover:text-cyan-600 transition-colors"
              >
                All Products
              </Link>
              <Link
                href="/store?featured=true"
                className="text-sm text-slate-600 hover:text-cyan-600 transition-colors"
              >
                Featured
              </Link>
            </nav>
          </div>

          {/* Search + Cart */}
          <div className="flex items-center gap-2">
            {/* Desktop expandable search */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center">
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  searchOpen ? "w-56 opacity-100 mr-1" : "w-0 opacity-0"
                }`}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                />
              </div>
              <button
                type="button"
                onClick={toggleSearch}
                className="p-2 text-slate-500 hover:text-cyan-600 transition-colors"
                aria-label={searchOpen ? "Close search" : "Open search"}
              >
                {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
            </form>

            {/* Mobile search (full width below header) */}
            <button
              type="button"
              onClick={toggleSearch}
              className="sm:hidden p-2 text-slate-500 hover:text-cyan-600 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Auth */}
            {isAuthenticated ? (
              <Link
                href="/account"
                className="p-2 text-slate-500 hover:text-cyan-600 transition-colors"
                title="My Account"
              >
                <User className="w-5 h-5" />
              </Link>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  href="/login"
                  className="px-2.5 py-1.5 text-sm text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex rounded-full bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-1.5 text-sm text-white font-semibold hover:from-cyan-500 hover:to-cyan-400 transition-all hover:shadow-md hover:shadow-cyan-500/20"
                >
                  Join
                </Link>
              </div>
            )}

            {/* Cart */}
            <Link
              href="/store/cart"
              className="relative p-2 text-slate-500 hover:text-cyan-600 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span
                  key={itemCount}
                  className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-cyan-500 rounded-full animate-[bounce_0.3s_ease-in-out]"
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile search bar (drops below header) */}
        {searchOpen && (
          <form onSubmit={handleSearch} className="sm:hidden pb-3 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search products..."
              autoFocus
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              className="px-3 py-2 text-sm font-medium text-white bg-cyan-500 rounded-lg hover:bg-cyan-600"
            >
              Go
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
