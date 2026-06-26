"use client";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

/**
 * Displays a dismissible banner when the user is redirected to the home page
 * due to an expired Google OAuth session (e.g. ?error=SessionExpired).
 */
export default function SessionExpiredBanner() {
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("error") === "SessionExpired";

  if (!isExpired) return null;

  return (
    <div className="w-full flex justify-center px-4 pt-4 z-50">
      <div className="flex items-start gap-3 w-full max-w-2xl bg-amber-950/60 border border-amber-500/30 text-amber-300 rounded-xl px-4 py-3 text-sm backdrop-blur-sm shadow-lg">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
        <span>
          <strong className="font-semibold text-amber-200">Session expired.</strong>{" "}
          Your Google login token could not be refreshed. Please sign in again to reconnect Gmail.
        </span>
      </div>
    </div>
  );
}
