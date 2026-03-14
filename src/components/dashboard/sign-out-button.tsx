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
        if (bypassEnabled) {
          window.location.href = "/login";
          return;
        }

        void signOut({ callbackUrl: "/" });
      }}
    >
      <LogOut className="h-4 w-4" />
      {bypassEnabled ? "Exit demo mode" : "Sign out"}
    </Button>
  );
}
