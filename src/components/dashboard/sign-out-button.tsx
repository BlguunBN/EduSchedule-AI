"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { isDevAuthBypassPublicEnabled } from "@/lib/auth-config";

export function SignOutButton() {
  const bypassEnabled = isDevAuthBypassPublicEnabled();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        // Always clear NextAuth session cookie so account switching works reliably.
        void signOut({ callbackUrl: "/login" });
      }}
    >
      <LogOut className="h-4 w-4" />
      {bypassEnabled ? "Sign out / exit demo" : "Sign out"}
    </Button>
  );
}
