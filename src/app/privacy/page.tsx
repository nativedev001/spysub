import { LockKeyhole } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

const sections = [
  [
    "Information we process",
    "SubSpy may process account profile details, subscription records, renewal dates, invoice data you enter, and email snippets used to identify recurring charges.",
  ],
  [
    "How we use information",
    "We use information to show subscription dashboards, generate savings recommendations, prepare cancellation drafts, create invoice previews, and improve product reliability.",
  ],
  [
    "Local-first prototype storage",
    "In this prototype, several features use browser localStorage. When database storage is added, saved records can move to authenticated user-owned database rows.",
  ],
  [
    "Third-party services",
    "Google OAuth, Gmail APIs, Gemini, and deal provider websites may be used depending on the feature. Their own privacy policies apply to their services.",
  ],
  [
    "Your choices",
    "You can delete locally stored subscription records from your browser, disconnect OAuth access from your Google account, and avoid entering sensitive invoice data.",
  ],
  [
    "Contact",
    "For privacy questions, use the contact channel that will be added when SubSpy moves from prototype to production.",
  ],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-slate-100">
      <SiteHeader sticky />
      <section className="max-w-4xl mx-auto px-6 py-8">
        <header className="py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
            <LockKeyhole className="w-3.5 h-3.5" />
            Privacy Policy
          </div>
          <h1 className="mt-6 text-4xl font-extrabold text-white">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Last updated: June 5, 2026
          </p>
        </header>

        <div className="space-y-4">
          {sections.map(([title, description]) => (
            <section
              key={title}
              className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-6"
            >
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                {description}
              </p>
            </section>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
