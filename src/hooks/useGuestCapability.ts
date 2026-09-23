"use client";
import { useEffect, useState } from "react";

/** Preserve a fragment capability over refresh/payment navigation in this tab. */
export function useGuestCapability(key: string) {
  const [state, setState] = useState({ token: "", ready: false });
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    let saved = "";
    try {
      if (token) sessionStorage.setItem(key, token);
      saved = sessionStorage.getItem(key) || "";
    } catch {
      /* Storage-disabled browsers can still use the fragment. */
    }
    setState({ token: token || saved, ready: true });
  }, [key]);
  return state;
}
