import { FileText } from "lucide-react"
import SiteFooter from "@/components/SiteFooter"
import SiteHeader from "@/components/SiteHeader"

const sections = [
  ["Use of the service", "SubSpy is provided to help users understand subscriptions, trial deadlines, spending patterns, invoices, and savings opportunities. You are responsible for reviewing any recommendation before acting on it."],
  ["Prototype status", "Some features are currently local-first and may change as database storage, paid plans, notifications, and team features are added."],
  ["No financial guarantee", "Savings estimates and deal suggestions are informational. SubSpy does not guarantee a discount, refund, cancellation outcome, or financial result."],
  ["User content", "You are responsible for subscription records, invoice details, logos, and other content you upload or enter into the product."],
  ["Third-party links", "Deal pages, cancellation portals, AI providers, hosting providers, registrars, and payment providers are third-party services. SubSpy is not responsible for their pricing, availability, or policies."],
  ["Changes", "These terms may be updated as the product moves from prototype to production."],
]

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-slate-100">
      <SiteHeader sticky />
      <section className="max-w-4xl mx-auto px-6 py-8">
        <header className="py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
            <FileText className="w-3.5 h-3.5" />
            Terms and Conditions
          </div>
          <h1 className="mt-6 text-4xl font-extrabold text-white">Terms and Conditions</h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: June 5, 2026</p>
        </header>

        <div className="space-y-4">
          {sections.map(([title, description]) => (
            <section key={title} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-6">
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">{description}</p>
            </section>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
