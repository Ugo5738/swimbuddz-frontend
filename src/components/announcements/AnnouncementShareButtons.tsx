"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type AnnouncementShareButtonsProps = {
  whatsapp: string;
  email: string;
};

export function AnnouncementShareButtons({
  whatsapp,
  email,
}: AnnouncementShareButtonsProps) {
  const [message, setMessage] = useState("");

  async function handleCopy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setMessage(`${label} copied to clipboard`);
    setTimeout(() => setMessage(""), 2500);
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-3 md:grid-cols-2">
        <Button
          variant="secondary"
          onClick={() => handleCopy(whatsapp, "WhatsApp text")}
        >
          Copy WhatsApp text
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleCopy(email, "Email text")}
        >
          Copy email text
        </Button>
      </div>
      {message ? (
        <p className="text-sm font-medium text-cyan-700">{message}</p>
      ) : null}
    </div>
  );
}
