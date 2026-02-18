"use client";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { supabase } from "@/lib/auth";
import { User } from "@supabase/supabase-js";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Types matching backend schemas
export interface CartItem {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price_ngn: number;
  variant?: {
    id: string;
    sku: string;
    name: string | null;
    options: Record<string, string>;
    product?: {
      id: string;
      name: string;
      slug: string;
      images?: { url: string; is_primary: boolean }[];
    };
  };
}

export interface Cart {
  id: string;
  status: string;
  discount_code: string | null;
  member_discount_percent: number | null;
  items: CartItem[];
  subtotal_ngn: number;
  discount_amount_ngn: number;
  total_ngn: number;
}

interface StoreCartContextType {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  isAuthenticated: boolean;
  refreshCart: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyDiscount: (
    code: string,
  ) => Promise<{ success: boolean; message?: string }>;
  removeDiscount: () => Promise<void>;
  clearCart: () => void;
}

const StoreCartContext = createContext<StoreCartContextType | undefined>(
  undefined,
);

const SESSION_KEY = "swimbuddz_store_session";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const itemCount =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const isAuthenticated = !!user;

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
          setAuthLoading(false);
        }
      } catch {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const sessionId = getSessionId();
      // Always send session_id so backend can merge guest cart on login
      const sessionParam = sessionId ? `?session_id=${sessionId}` : "";

      const cartData = await apiGet<Cart>(`/api/v1/store/cart${sessionParam}`, {
        auth: !!user,
      }).catch(() => null);

      setCart(cartData);
    } catch (e) {
      console.error("Failed to load cart:", e);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load cart when auth state settles
  useEffect(() => {
    if (!authLoading) {
      refreshCart();
    }
  }, [authLoading, refreshCart]);

  const addItem = useCallback(
    async (variantId: string, quantity: number = 1) => {
      const sessionId = getSessionId();
      const sessionParam = sessionId ? `?session_id=${sessionId}` : "";

      await apiPost(
        `/api/v1/store/cart/items${sessionParam}`,
        { variant_id: variantId, quantity },
        { auth: !!user },
      );
      await refreshCart();
    },
    [user, refreshCart],
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      const sessionId = getSessionId();
      const sessionParam = sessionId ? `?session_id=${sessionId}` : "";

      await apiPatch(
        `/api/v1/store/cart/items/${itemId}${sessionParam}`,
        { quantity },
        { auth: !!user },
      );
      await refreshCart();
    },
    [user, refreshCart],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const sessionId = getSessionId();
      const sessionParam = sessionId ? `?session_id=${sessionId}` : "";

      await apiDelete(`/api/v1/store/cart/items/${itemId}${sessionParam}`, {
        auth: !!user,
      });
      await refreshCart();
    },
    [user, refreshCart],
  );

  const applyDiscount = useCallback(
    async (code: string): Promise<{ success: boolean; message?: string }> => {
      const sessionId = getSessionId();
      const sessionParam = sessionId ? `?session_id=${sessionId}` : "";

      try {
        await apiPost(
          `/api/v1/store/cart/discount${sessionParam}`,
          { code },
          { auth: !!user },
        );
        await refreshCart();
        return { success: true, message: `Discount "${code}" applied` };
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Invalid discount code";
        return { success: false, message };
      }
    },
    [user, refreshCart],
  );

  const removeDiscount = useCallback(async () => {
    const sessionId = getSessionId();
    const sessionParam = sessionId ? `?session_id=${sessionId}` : "";

    await apiDelete(`/api/v1/store/cart/discount${sessionParam}`, {
      auth: !!user,
    });
    await refreshCart();
  }, [user, refreshCart]);

  const clearCart = useCallback(() => {
    setCart(null);
  }, []);

  return (
    <StoreCartContext.Provider
      value={{
        cart,
        loading,
        itemCount,
        isAuthenticated,
        refreshCart,
        addItem,
        updateItem,
        removeItem,
        applyDiscount,
        removeDiscount,
        clearCart,
      }}
    >
      {children}
    </StoreCartContext.Provider>
  );
}

export function useStoreCart() {
  const context = useContext(StoreCartContext);
  if (context === undefined) {
    throw new Error("useStoreCart must be used within a StoreCartProvider");
  }
  return context;
}
