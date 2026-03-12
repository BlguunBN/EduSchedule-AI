"use client";

import { useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      variant="primary"
      className="w-full"
      onClick={async () => {
        try {
          setIsLoading(true);
          await signIn("microsoft-entra-id", { callbackUrl: "/dashboard" });
        } finally {
          setIsLoading(false);
        }
      }}
    >
      {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
      Continue with Microsoft
    </Button>
  );
}
