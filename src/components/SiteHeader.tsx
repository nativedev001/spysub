"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Sparkles } from "lucide-react";

export default function SiteHeader({
  action,
  sticky = false,
  className = "",
}: {
  action?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  const { status } = useSession();
  const defaultAction =
    status === "authenticated" ? (
      <Link
        href="/dashboard"
        className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors duration-200 hover:bg-emerald-500/15 hover:text-emerald-200"
      >
        Dashboard
      </Link>
    ) : status === "unauthenticated" ? (
      <Link
        href="/dashboard?demo=true"
        className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
      >
        Try Demo
      </Link>
    ) : (
      <div className="h-9 w-24 rounded-lg border border-white/10 bg-white/5" />
    );

  return (
    <header
      className={`site-header mx-auto flex w-full max-w-7xl items-center justify-between border-b border-zinc-900/80 bg-black/70 px-6 py-5 backdrop-blur-md ${sticky ? "sticky top-0 z-50" : ""} ${className}`}
    >
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-500 p-[2px] shadow-lg shadow-indigo-500/20">
          <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-black">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          SubSpy{" "}
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-sm font-semibold text-emerald-400">
            AI
          </span>
        </span>
      </Link>

      {action ?? defaultAction}
    </header>
  );
}
