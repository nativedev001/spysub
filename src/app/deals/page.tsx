"use client"

import { useMemo, useState } from "react"
import { ArrowUpRight, Bookmark, Check, Filter, Search, Tag } from "lucide-react"
import SiteFooter from "@/components/SiteFooter"
import SiteHeader from "@/components/SiteHeader"

interface Deal {
  id: string
  vendor: string
  title: string
  category: "AI" | "Domains" | "Hosting" | "Cloud"
  saving: string
  bestFor: string
  source: string
  status: "Official" | "Promo" | "Program"
}

const deals: Deal[] = [
  {
    id: "openai-chatgpt",
    vendor: "OpenAI",
    title: "Compare Free, Go, Plus, Pro, Business, and Enterprise before upgrading",
    category: "AI",
    saving: "Avoid overbuying AI seats",
    bestFor: "Students, founders, creators, and small teams comparing ChatGPT plans.",
    source: "https://openai.com/chatgpt/pricing",
    status: "Official",
  },
  {
    id: "claude-plans",
    vendor: "Claude",
    title: "Choose between Free, Pro, Max, Team, and Enterprise plans",
    category: "AI",
    saving: "Match usage tier to real workload",
    bestFor: "Writers, developers, researchers, and heavy Claude users.",
    source: "https://support.claude.com/en/articles/11049762-choose-a-claude-plan",
    status: "Official",
  },
  {
    id: "namecheap-promos",
    vendor: "Namecheap",
    title: "Domain, email, hosting, SSL, and EasyWP promo hub",
    category: "Domains",
    saving: "Up to listed promo discounts",
    bestFor: "New domains, business email, SSL renewals, and WordPress hosting trials.",
    source: "https://www.namecheap.com/promos/",
    status: "Promo",
  },
  {
    id: "namecheap-create",
    vendor: "Namecheap",
    title: "Create and Innovate sale for domain, email, hosting, and marketing tools",
    category: "Domains",
    saving: "Limited-time bundled offers",
    bestFor: "New business launches that need domain plus basic web stack.",
    source: "https://www.namecheap.com/promos/holiday-deals/",
    status: "Promo",
  },
  {
    id: "hostinger-hosting",
    vendor: "Hostinger",
    title: "Cheap web hosting and seasonal hosting deal pages",
    category: "Hosting",
    saving: "Intro pricing and annual discounts",
    bestFor: "Personal websites, WordPress sites, and low-cost startup landing pages.",
    source: "https://www.hostinger.com/cheap-web-hosting",
    status: "Promo",
  },
  {
    id: "hostinger-black-friday",
    vendor: "Hostinger",
    title: "Seasonal web hosting deal tracker",
    category: "Hosting",
    saving: "Sale pricing when active",
    bestFor: "Users willing to wait for bigger seasonal discounts.",
    source: "https://www.hostinger.com/black-friday-web-hosting-deals",
    status: "Promo",
  },
  {
    id: "digitalocean-startups",
    vendor: "DigitalOcean",
    title: "Startup cloud credits program",
    category: "Cloud",
    saving: "Credits for eligible startups",
    bestFor: "Early-stage startups running apps, databases, storage, or cloud hosting.",
    source: "https://www.digitalocean.com/startups",
    status: "Program",
  },
]

const categories = ["All", "AI", "Domains", "Hosting", "Cloud"] as const

export default function DealsPage() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<(typeof categories)[number]>("All")
  const [savedDeals, setSavedDeals] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(localStorage.getItem("subspy_saved_deals") || "[]")
    } catch {
      return []
    }
  })

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesCategory = category === "All" || deal.category === category
      const haystack = `${deal.vendor} ${deal.title} ${deal.bestFor}`.toLowerCase()
      const matchesQuery = !query || haystack.includes(query.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [category, query])

  const toggleSaved = (id: string) => {
    setSavedDeals((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      localStorage.setItem("subspy_saved_deals", JSON.stringify(next))
      return next
    })
  }

  return (
    <main className="min-h-screen bg-black text-slate-100">
      <SiteHeader sticky />
      <section className="max-w-7xl mx-auto px-6 py-8">
        <header className="py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
            <Tag className="w-3.5 h-3.5" />
            Savings opportunities
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Deal radar for AI tools, domains, hosting, and startup cloud credits.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
            Save useful offers locally for now. When database storage is added, this can become a personalized saved-deals library.
          </p>
        </header>

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-900 bg-zinc-950/70 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GPT, Claude, hosting..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                  category === item
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-zinc-800 bg-zinc-900 text-slate-400 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDeals.map((deal) => {
            const isSaved = savedDeals.includes(deal.id)

            return (
              <article key={deal.id} className="rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5 hover:border-emerald-500/25 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-extrabold text-emerald-400">{deal.vendor}</span>
                    <h2 className="mt-2 text-lg font-bold leading-snug text-white">{deal.title}</h2>
                  </div>
                  <button
                    onClick={() => toggleSaved(deal.id)}
                    className={`rounded-lg border p-2 ${isSaved ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-900 text-slate-400 hover:text-white"}`}
                    title={isSaved ? "Saved" : "Save deal"}
                  >
                    {isSaved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-bold text-slate-400">{deal.category}</span>
                  <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[11px] font-bold text-indigo-300">{deal.status}</span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400">{deal.bestFor}</p>
                <p className="mt-3 text-sm font-bold text-white">{deal.saving}</p>

                <a
                  href={deal.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-black hover:bg-emerald-400"
                >
                  View source
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </article>
            )
          })}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
