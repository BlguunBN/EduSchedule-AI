"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const bypassEnabled = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";

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
