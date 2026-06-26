import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import SessionExpiredBanner from "@/components/SessionExpiredBanner";
import {
  Sparkles,
  Shield,
  BarChart3,
  Mail,
  Bell,
  ArrowRight,
} from "lucide-react";

export default async function Home() {
  const session = await auth();

  // If already authenticated, redirect directly to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black overflow-x-hidden relative">
      {/* Background Radial Glow Effect */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-900/10 blur-[150px] pointer-events-none" />
      <SiteHeader sticky />
      {/* Session expiry notification — shown when redirected back after token refresh fails */}
      <Suspense fallback={null}>
        <SessionExpiredBanner />
      </Suspense>
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 flex-1 flex flex-col items-center justify-center py-16 md:py-24 text-center z-10">
        {/* Banner Announcement */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-8 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Track Trials, End Subscriptions & Save Instantly</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Uncover Hidden Subscriptions. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            Save Smarter with SubSpy AI.
          </span>
        </h1>

        {/* Hero Description */}
        <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          Log in, connect your email, and let our AI engine scan your inbox to
          map your active subscriptions, calculate trial countdowns, and build
          custom cancellation strategies.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-xl">
          {/* Sign In with Google Form (Server Action) */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
            className="w-full"
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white text-black font-semibold hover:bg-slate-200 transition-all duration-200 shadow-xl shadow-white/5 text-base cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Connect with Google
            </button>
          </form>

          {/* Try Demo Button */}
          <Link
            href="/dashboard?demo=true"
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-zinc-900 border border-zinc-800 text-slate-200 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200 font-semibold text-base"
          >
            Explore Demo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Security / Privacy Trust Badge */}
        <div className="mt-8 flex items-center justify-center gap-2 text-slate-500 text-xs">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>
            Secure OAuth 2.0 connection. Your emails never leave your browser.
          </span>
        </div>

        {/* Feature Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {/* Card 1 */}
          <div className="group rounded-2xl bg-zinc-950/60 border border-zinc-900 p-8 text-left hover:border-indigo-500/30 transition-all duration-300 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-300" />
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
              <Mail className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Automated Inbox Scanning
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Queries your Gmail account safely for receipts, bills, and
              subscription confirmations, mapping them in seconds.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group rounded-2xl bg-zinc-950/60 border border-zinc-900 p-8 text-left hover:border-purple-500/30 transition-all duration-300 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-300" />
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
              <Bell className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Trial Expiration Safeguards
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Detects trial configurations and provides proactive alerts days
              before credit cards are billed for auto-renewals.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group rounded-2xl bg-zinc-950/60 border border-zinc-900 p-8 text-left hover:border-emerald-500/30 transition-all duration-300 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300" />
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              SubSpy Savings Advisory
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              AI evaluates redundant streaming or SaaS platforms, flags
              duplicate pricing, and drafts negotiation scripts to lower bills.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
