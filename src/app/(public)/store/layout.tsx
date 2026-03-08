import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreCartProvider } from "@/lib/storeCart";
import { Clock, Mail, MapPin, ShieldCheck } from "lucide-react";
import { ReactNode } from "react";

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <StoreCartProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Store Header (client component — cart badge + search) */}
        <StoreHeader />

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 mt-auto">
          {/* Trust Icons */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-900">Free Pool Pickup</p>
                  <p className="text-xs text-slate-500">At any session</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-900">Secure Payment</p>
                  <p className="text-xs text-slate-500">via Paystack</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-900">1-3 Day Processing</p>
                  <p className="text-xs text-slate-500">Quick turnaround</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-900">Need Help?</p>
                  <p className="text-xs text-slate-500">store@swimbuddz.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Site links + Policy */}
          <div className="border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-slate-400">
              <p>All sales are final. Store credit available for exceptions.</p>
              <div className="flex flex-wrap items-center gap-4">
                <a href="/" className="hover:text-cyan-600 transition-colors">
                  Home
                </a>
                <a href="/membership" className="hover:text-cyan-600 transition-colors">
                  Membership
                </a>
                <a href="/privacy" className="hover:text-cyan-600 transition-colors">
                  Privacy
                </a>
                <a href="/announcements" className="hover:text-cyan-600 transition-colors">
                  Announcements
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </StoreCartProvider>
  );
}
