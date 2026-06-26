import { BarChart3, BellRing, Mail, ShieldCheck } from "lucide-react"
import SiteFooter from "@/components/SiteFooter"
import SiteHeader from "@/components/SiteHeader"

const values = [
  {
    title: "Find the forgotten bills",
    description: "SubSpy scans for receipts, trials, renewals, and recurring payment signals so users can see what is quietly draining their budget.",
    icon: Mail,
  },
  {
    title: "Turn insight into action",
    description: "The dashboard prioritizes trials, renewals, high spend, and cancellation steps instead of leaving users with another static report.",
    icon: BellRing,
  },
  {
    title: "Make savings measurable",
    description: "Budget guardrails, category spend, exportable records, and AI recommendations help users track whether they are actually saving money.",
    icon: BarChart3,
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-slate-100">
      <SiteHeader sticky />
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Built for subscription clarity
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            We help people stop paying for things they forgot they signed up for.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400">
            SubSpy AI is a personal subscription intelligence tool. It brings recurring charges, trial deadlines, cancellation links, and saving opportunities into one focused workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {values.map((item) => (
            <div key={item.title} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-6">
              <item.icon className="h-6 w-6 text-emerald-400" />
              <h2 className="mt-5 text-lg font-bold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-zinc-900 bg-zinc-950/70 p-6">
          <h2 className="text-xl font-bold text-white">Where the product is going</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            The current version stores user-created data locally while the product experience is being shaped. The next stage can add accounts, saved invoices, tracked deals, notification preferences, and team billing backed by a database.
          </p>
        </section>
      </section>
      <SiteFooter />
    </main>
  )
}
