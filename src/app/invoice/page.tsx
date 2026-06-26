"use client"

import Image from "next/image"
import Link from "next/link"
import SiteFooter from "@/components/SiteFooter"
import { ChangeEvent, useMemo, useState } from "react"
import { Download, Palette, Plus, Printer, Sparkles, Trash2, Upload } from "lucide-react"

interface InvoiceItem {
  id: number
  description: string
  quantity: number
  rate: number
}

type InvoiceTemplate = "classic" | "modern" | "compact" | "executive" | "creative" | "ledger" | "studio" | "minimal"

const initialItems: InvoiceItem[] = [
  { id: 1, description: "Subscription audit setup", quantity: 1, rate: 49 },
  { id: 2, description: "Monthly software monitoring", quantity: 1, rate: 19 },
]

const templates: Record<InvoiceTemplate, { label: string; description: string; preview: "bar" | "split" | "stamp" | "stripe" | "box" | "minimal" }> = {
  classic: {
    label: "Classic",
    description: "Clean white invoice with calm borders and traditional spacing.",
    preview: "bar",
  },
  modern: {
    label: "Modern",
    description: "Bold accent header for SaaS, consulting, and productized services.",
    preview: "split",
  },
  compact: {
    label: "Compact",
    description: "Tighter layout for short invoices and quick PDF sharing.",
    preview: "minimal",
  },
  executive: {
    label: "Executive",
    description: "Premium letterhead style with a strong total block.",
    preview: "stamp",
  },
  creative: {
    label: "Creative",
    description: "Designed for creators, agencies, and brand-forward services.",
    preview: "stripe",
  },
  ledger: {
    label: "Ledger",
    description: "Structured accounting layout with boxed invoice metadata.",
    preview: "box",
  },
  studio: {
    label: "Studio",
    description: "Editorial side-band layout for polished client-facing work.",
    preview: "split",
  },
  minimal: {
    label: "Minimal",
    description: "Quiet, spacious invoice for simple professional sharing.",
    preview: "minimal",
  },
}

const accents = [
  { label: "Emerald", value: "#10b981" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Slate", value: "#0f172a" },
  { label: "Rose", value: "#e11d48" },
  { label: "Amber", value: "#d97706" },
]

const currencies = ["USD", "PKR", "EUR", "GBP"] as const

const currencySymbols: Record<(typeof currencies)[number], string> = {
  USD: "$",
  PKR: "PKR",
  EUR: "EUR",
  GBP: "GBP",
}

export default function InvoicePage() {
  const [logoUrl, setLogoUrl] = useState("")
  const [template, setTemplate] = useState<InvoiceTemplate>("modern")
  const [accent, setAccent] = useState(accents[0].value)
  const [currency, setCurrency] = useState<(typeof currencies)[number]>("USD")
  const [invoiceNo, setInvoiceNo] = useState("INV-2026-001")
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState("")
  const [from, setFrom] = useState("SubSpy AI\nYour Company\nhello@example.com\n+1 555 0100")
  const [to, setTo] = useState("Client Name\nClient Company\nclient@example.com")
  const [paymentTerms, setPaymentTerms] = useState("Due on receipt")
  const [paymentDetails, setPaymentDetails] = useState("Bank transfer, card, or agreed payment method.")
  const [notes, setNotes] = useState("Thank you for your business.")
  const [taxRate, setTaxRate] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [items, setItems] = useState<InvoiceItem[]>(initialItems)

  const money = (amount: number) => `${currencySymbols[currency]} ${amount.toFixed(2)}`

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
    const discountAmount = Math.min(discount, subtotal)
    const taxableAmount = Math.max(subtotal - discountAmount, 0)
    const tax = taxableAmount * (taxRate / 100)
    return { subtotal, discountAmount, taxableAmount, tax, total: taxableAmount + tax }
  }, [items, taxRate, discount])

  const updateItem = (id: number, field: keyof InvoiceItem, value: string) => {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item
      if (field === "description") return { ...item, description: value }
      return { ...item, [field]: Number(value) || 0 }
    }))
  }

  const addItem = () => {
    setItems((current) => [
      ...current,
      { id: Date.now(), description: "New line item", quantity: 1, rate: 0 },
    ])
  }

  const removeItem = (id: number) => {
    setItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== id))
  }

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setLogoUrl(URL.createObjectURL(file))
  }

  const documentClasses = [
    "invoice-document bg-white text-slate-950 shadow-2xl",
    template === "classic" ? "rounded-2xl border border-slate-200 p-10" : "",
    template === "modern" ? "rounded-2xl border border-slate-200 overflow-hidden" : "",
    template === "compact" ? "rounded-xl border border-slate-200 p-7" : "",
    template === "executive" ? "rounded-2xl border border-slate-200 p-10" : "",
    template === "creative" ? "rounded-[28px] border border-slate-200 overflow-hidden" : "",
    template === "ledger" ? "rounded-2xl border-2 border-slate-900 p-8" : "",
    template === "studio" ? "rounded-2xl border border-slate-200 overflow-hidden" : "",
    template === "minimal" ? "rounded-2xl border border-slate-100 p-12" : "",
  ].join(" ")

  const contentPadding = ["modern", "creative", "studio"].includes(template) ? "p-10" : ""
  const hasTopAccent = ["modern", "creative"].includes(template)
  const hasSideAccent = template === "studio"
  const isCompact = template === "compact"
  const isLedger = template === "ledger"
  const isMinimal = template === "minimal"
  const isExecutive = template === "executive"
  const isCreative = template === "creative"
  const metadataBoxClass = isLedger
    ? "rounded-xl border border-slate-300 p-4"
    : isExecutive
      ? "rounded-xl bg-slate-950 p-4 text-white"
      : ""

  return (
    <main className="invoice-app-shell min-h-screen bg-black text-slate-100">
      <section className="max-w-7xl mx-auto px-6 py-8 invoice-document-wrap">
        <nav className="invoice-app-nav flex items-center justify-between border-b border-zinc-900 pb-5">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            SubSpy AI
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-black hover:bg-emerald-400"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </nav>

        <div className="invoice-app-intro py-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Professional Invoice Generator</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Build a client-ready invoice with logo, templates, colors, tax, discount, payment terms, and a clean PDF-only print layout.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 invoice-main-grid">
          <aside className="invoice-editor lg:col-span-4 rounded-2xl border border-zinc-900 bg-zinc-950/70 p-5 flex flex-col gap-5">
            <section className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-4">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
                <Palette className="h-4 w-4 text-emerald-400" />
                Design
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(Object.keys(templates) as InvoiceTemplate[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setTemplate(key)}
                    className={`rounded-xl border p-2 text-left transition-colors ${
                      template === key
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-800 bg-zinc-950 text-slate-400 hover:text-white"
                    }`}
                    title={templates[key].description}
                  >
                    <TemplatePreview kind={templates[key].preview} accent={accent} active={template === key} />
                    <span className="mt-2 block text-xs font-extrabold">{templates[key].label}</span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{templates[key].description}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                {accents.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setAccent(item.value)}
                    className={`h-8 w-8 rounded-full border-2 ${accent === item.value ? "border-white" : "border-zinc-800"}`}
                    style={{ backgroundColor: item.value }}
                    title={item.label}
                  />
                ))}
              </div>
            </section>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/60 px-4 py-5 text-sm font-semibold text-slate-300 hover:text-white">
              <Upload className="h-4 w-4" />
              Upload Company Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>

            <section className="grid grid-cols-2 gap-3">
              <Control label="Invoice no.">
                <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="invoice-control-input" />
              </Control>
              <Control label="Currency">
                <select value={currency} onChange={(e) => setCurrency(e.target.value as (typeof currencies)[number])} className="invoice-control-input">
                  {currencies.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Control>
              <Control label="Issue date">
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="invoice-control-input" />
              </Control>
              <Control label="Due date">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="invoice-control-input" />
              </Control>
            </section>

            <section className="grid grid-cols-1 gap-4">
              <Control label="From">
                <textarea value={from} onChange={(e) => setFrom(e.target.value)} rows={4} className="invoice-control-input resize-none" />
              </Control>
              <Control label="Bill to">
                <textarea value={to} onChange={(e) => setTo(e.target.value)} rows={4} className="invoice-control-input resize-none" />
              </Control>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <Control label="Tax %">
                <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} className="invoice-control-input" />
              </Control>
              <Control label={`Discount (${currency})`}>
                <input type="number" value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} className="invoice-control-input" />
              </Control>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-white">Line items</h2>
                <button onClick={addItem} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-bold text-black hover:bg-emerald-400">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <input value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} className="invoice-control-input" />
                  <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} className="invoice-control-input" placeholder="Qty" />
                    <input type="number" value={item.rate} onChange={(e) => updateItem(item.id, "rate", e.target.value)} className="invoice-control-input" placeholder="Rate" />
                    <button onClick={() => removeItem(item.id)} className="rounded-lg border border-zinc-800 px-2 text-slate-400 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </section>

            <Control label="Payment terms">
              <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="invoice-control-input" />
            </Control>
            <Control label="Payment details">
              <textarea value={paymentDetails} onChange={(e) => setPaymentDetails(e.target.value)} rows={3} className="invoice-control-input resize-none" />
            </Control>
            <Control label="Notes">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="invoice-control-input resize-none" />
            </Control>

            <button onClick={() => window.print()} className="invoice-print-actions flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-black hover:bg-slate-200">
              <Download className="h-4 w-4" />
              Download Clean PDF
            </button>
          </aside>

          <section className="lg:col-span-8">
            <article className={documentClasses}>
              {hasTopAccent && (
                <div className={isCreative ? "h-20 w-full" : "h-3 w-full"} style={{ backgroundColor: accent }}>
                  {isCreative && <div className="px-10 py-5 text-xl font-extrabold tracking-tight text-white">Invoice Statement</div>}
                </div>
              )}

              <div className={hasSideAccent ? "grid grid-cols-[88px_1fr]" : ""}>
                {hasSideAccent && (
                  <div className="min-h-full p-6 text-white" style={{ backgroundColor: accent }}>
                    <div className="[writing-mode:vertical-rl] rotate-180 text-2xl font-extrabold tracking-tight">INVOICE</div>
                  </div>
                )}

              <div className={contentPadding}>
                <div className={`flex gap-8 ${isCompact ? "items-center justify-between" : "flex-col sm:flex-row sm:items-start sm:justify-between"} ${isMinimal ? "border-b border-slate-100 pb-10" : ""}`}>
                  <div>
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Invoice logo" width={176} height={64} unoptimized className="mb-5 h-16 max-w-44 object-contain" />
                    ) : (
                      <div className={`mb-5 flex h-16 w-16 items-center justify-center text-white ${isMinimal ? "rounded-full" : "rounded-xl"}`} style={{ backgroundColor: accent }}>
                        <Sparkles className="h-6 w-6" />
                      </div>
                    )}
                    <h2 className={isCompact ? "text-2xl font-extrabold" : isExecutive ? "text-5xl font-black tracking-tight" : "text-4xl font-extrabold"}>Invoice</h2>
                    <p className="mt-2 text-sm text-slate-500">{invoiceNo}</p>
                  </div>

                  <div className="text-left sm:text-right text-sm leading-6 text-slate-600 whitespace-pre-line">{from}</div>
                </div>

                <div className={`grid grid-cols-1 gap-6 sm:grid-cols-3 ${isCompact || isMinimal ? "mt-8" : "mt-12"}`}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Bill To</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{to}</p>
                  </div>
                  <div className={metadataBoxClass}>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Issue Date</p>
                    <p className={`mt-2 text-sm ${isExecutive ? "text-white" : "text-slate-700"}`}>{issueDate || "-"}</p>
                  </div>
                  <div className={metadataBoxClass}>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Payment Terms</p>
                    <p className={`mt-2 text-sm ${isExecutive ? "text-white" : "text-slate-700"}`}>{paymentTerms}</p>
                    {dueDate && <p className="mt-1 text-xs text-slate-500">Due {dueDate}</p>}
                  </div>
                </div>

                <div className={isCompact || isMinimal ? "mt-8" : "mt-12"}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className={`text-left text-xs uppercase tracking-wide ${isLedger ? "bg-slate-950 text-white" : "text-slate-400"}`}
                        style={{ borderBottom: `2px solid ${accent}` }}
                      >
                        <th className="py-3">Description</th>
                        <th className="py-3 text-right">Qty</th>
                        <th className="py-3 text-right">Rate</th>
                        <th className="py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="py-4 pr-4 font-medium text-slate-800">{item.description}</td>
                          <td className="py-4 text-right text-slate-600">{item.quantity}</td>
                          <td className="py-4 text-right text-slate-600">{money(item.rate)}</td>
                          <td className="py-4 text-right font-bold text-slate-900">{money(item.quantity * item.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-[1fr_320px]">
                  <div className={`rounded-xl p-4 text-sm leading-6 text-slate-600 ${isMinimal ? "bg-white border border-slate-100" : "bg-slate-50"}`}>
                    <p className="font-bold text-slate-800">Payment details</p>
                    <p className="mt-2 whitespace-pre-line">{paymentDetails}</p>
                    <p className="mt-4 font-bold text-slate-800">Notes</p>
                    <p className="mt-2 whitespace-pre-line">{notes}</p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <SummaryRow label="Subtotal" value={money(totals.subtotal)} />
                    {discount > 0 && <SummaryRow label="Discount" value={`-${money(totals.discountAmount)}`} />}
                    <SummaryRow label={`Tax (${taxRate}%)`} value={money(totals.tax)} />
                    <div className={`flex items-center justify-between px-4 py-4 text-lg font-extrabold text-white ${isLedger ? "rounded-none" : "rounded-xl"}`} style={{ backgroundColor: accent }}>
                      <span>Total</span>
                      <span>{money(totals.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </article>
          </section>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}

function TemplatePreview({ kind, accent, active }: { kind: "bar" | "split" | "stamp" | "stripe" | "box" | "minimal"; accent: string; active: boolean }) {
  return (
    <div className={`h-24 rounded-lg border bg-white p-2 shadow-sm ${active ? "border-emerald-400/60" : "border-zinc-800"}`}>
      {kind === "bar" && (
        <div className="h-full">
          <div className="h-2 rounded-full" style={{ backgroundColor: accent }} />
          <div className="mt-3 h-3 w-10 rounded bg-slate-900" />
          <div className="mt-4 space-y-1.5">
            <div className="h-1.5 rounded bg-slate-200" />
            <div className="h-1.5 rounded bg-slate-200" />
            <div className="h-1.5 w-2/3 rounded bg-slate-200" />
          </div>
        </div>
      )}
      {kind === "split" && (
        <div className="grid h-full grid-cols-[24px_1fr] gap-2">
          <div className="rounded" style={{ backgroundColor: accent }} />
          <div>
            <div className="h-3 w-12 rounded bg-slate-900" />
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 rounded bg-slate-200" />
              <div className="h-1.5 rounded bg-slate-200" />
              <div className="h-5 rounded" style={{ backgroundColor: accent }} />
            </div>
          </div>
        </div>
      )}
      {kind === "stamp" && (
        <div className="h-full">
          <div className="flex justify-between">
            <div className="h-5 w-5 rounded-full" style={{ backgroundColor: accent }} />
            <div className="h-5 w-12 rounded bg-slate-900" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-900" />
          </div>
        </div>
      )}
      {kind === "stripe" && (
        <div className="h-full overflow-hidden rounded">
          <div className="h-8" style={{ backgroundColor: accent }} />
          <div className="p-2">
            <div className="h-3 w-14 rounded bg-slate-900" />
            <div className="mt-3 h-1.5 rounded bg-slate-200" />
            <div className="mt-1.5 h-1.5 w-2/3 rounded bg-slate-200" />
          </div>
        </div>
      )}
      {kind === "box" && (
        <div className="h-full border-2 border-slate-900 p-2">
          <div className="h-3 w-12 bg-slate-900" />
          <div className="mt-3 grid grid-cols-3 gap-1">
            <div className="h-8 border border-slate-300" />
            <div className="h-8 border border-slate-300" />
            <div className="h-8 border border-slate-300" />
          </div>
          <div className="mt-2 h-3" style={{ backgroundColor: accent }} />
        </div>
      )}
      {kind === "minimal" && (
        <div className="h-full">
          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: accent }} />
          <div className="mt-4 h-px bg-slate-200" />
          <div className="mt-4 space-y-2">
            <div className="h-1.5 rounded bg-slate-200" />
            <div className="h-1.5 w-1/2 rounded bg-slate-200" />
          </div>
        </div>
      )}
    </div>
  )
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2 text-slate-600">
      <span>{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  )
}
