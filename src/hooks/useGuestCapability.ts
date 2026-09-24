"use client";
import { useEffect, useState } from "react";

/** Preserve a fragment capability over refresh/payment navigation in this tab. */
export function useGuestCapability(key: string, fragmentKey = "token") {
  const [state, setState] = useState({ token: "", ready: false });
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get(fragmentKey) || "";
    let saved = "";
    try {
      if (token) sessionStorage.setItem(key, token);
      else if (fragment.has("token") || fragment.has("invite")) sessionStorage.removeItem(key);
      saved = sessionStorage.getItem(key) || "";
    } catch {
      /* Storage-disabled browsers can still use the fragment. */
    }
    setState({ token: token || saved, ready: true });
  }, [key, fragmentKey]);
  return state;
}
