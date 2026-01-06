import { StoreCartProvider } from "@/lib/storeCart";
import { ReactNode } from "react";

export default function StoreLayout({ children }: { children: ReactNode }) {
    return (
        <StoreCartProvider>
            <div className="min-h-screen bg-slate-50">
                {/* Store Header */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-8">
                                <a href="/store" className="flex items-center gap-2">
                                    <span className="text-2xl">🏊</span>
                                    <span className="font-bold text-xl text-slate-900">SwimBuddz Store</span>
                                </a>
                                <nav className="hidden md:flex items-center gap-6">
                                    <a href="/store" className="text-sm text-slate-600 hover:text-cyan-600 transition-colors">
                                        All Products
                                    </a>
                                    <a href="/store?featured=true" className="text-sm text-slate-600 hover:text-cyan-600 transition-colors">
                                        Featured
                                    </a>
                                </nav>
                            </div>
                            <div className="flex items-center gap-4">
                                <a
                                    href="/store/cart"
                                    className="relative p-2 text-slate-600 hover:text-cyan-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
                        <p>All sales are final. Store credit available for exceptions.</p>
                        <p className="mt-1">Questions? Contact us at store@swimbuddz.com</p>
                    </div>
                </footer>
            </div>
        </StoreCartProvider>
    );
}
