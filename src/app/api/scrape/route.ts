import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { google } from "googleapis"
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"

// Interface for subscriptions returned by parser
interface Subscription {
  name: string
  price: number
  currency: string
  frequency: "monthly" | "yearly" | "weekly" | "one-time"
  status: "active" | "trial" | "cancelled"
  renewalDate: string
  category: string
  confidence: number
}

interface EmailSummary {
  id?: string | null
  from: string
  subject: string
  snippet: string
  date: string
}

interface AuthSession {
  accessToken?: string
}

interface GeminiParseResult {
  source: "gmail_gemini" | "gmail_local_parsed"
  subscriptions: Subscription[]
  warning?: string
}

interface GeminiResponse {
  subscriptions?: Subscription[]
}

// Simulated emails for mock scraping
const MOCK_EMAILS = [
  {
    id: "m1",
    from: "Netflix <info@netflix.com>",
    subject: "Your membership renewal receipt",
    snippet: "Hi subscriber, thank you for being a member! This is your receipt for your monthly Premium plan renewal on June 1, 2026. We billed your payment method for $22.99 USD. Your next renewal date is July 1, 2026. To cancel, visit your account settings.",
    date: "2026-06-01T12:00:00Z"
  },
  {
    id: "m2",
    from: "OpenAI <billing@openai.com>",
    subject: "Invoice for ChatGPT Plus",
    snippet: "ChatGPT Plus subscription auto-renewal succeeded. Amount: $20.00 USD. Billed date: May 28, 2026. Next billing date: June 28, 2026. Thank you for your continued support.",
    date: "2026-05-28T08:30:00Z"
  },
  {
    id: "m3",
    from: "Canva <support@canva.com>",
    subject: "Canva Pro: Your free trial is ending soon!",
    snippet: "Hey there! Your Canva Pro free trial ends in 3 days on June 8, 2026. We hope you've enjoyed it! If you choose to stay, your monthly subscription will start at $12.99 USD. Cancel anytime before June 8 to avoid charges.",
    date: "2026-06-05T09:15:00Z"
  },
  {
    id: "m4",
    from: "Spotify <no-reply@spotify.com>",
    subject: "Spotify Premium Family Receipt",
    snippet: "Thanks for subscribing! Payment of $16.99 USD has been charged for Spotify Premium Family. Transaction date: May 30, 2026. Next payment due: June 30, 2026.",
    date: "2026-05-30T15:20:00Z"
  },
  {
    id: "m5",
    from: "Adobe Creative Cloud <mail@adobe.com>",
    subject: "Subscription Confirmation",
    snippet: "Thank you for your payment of $20.99 USD for your Creative Cloud Photography plan (Photoshop + Lightroom). Your monthly plan will renew automatically on June 15, 2026.",
    date: "2026-05-15T10:00:00Z"
  },
  {
    id: "m6",
    from: "Amazon Web Services <aws-billing@amazon.com>",
    subject: "AWS Cost Alert: Monthly Bill Available",
    snippet: "Your AWS billing statement is ready for May 2026. Total amount due: $14.50 USD. This will be charged automatically to your card on file. Next billing period: June 2026.",
    date: "2026-06-02T04:00:00Z"
  },
  {
    id: "m7",
    from: "Github <noreply@github.com>",
    subject: "[GitHub] Payment receipt for billing cycle starting May 10",
    snippet: "Hi there! Your credit card was charged $10.00 USD for GitHub Copilot. Your subscription will renew on June 10, 2026. If you want to change your billing plan, visit settings.",
    date: "2026-05-10T11:00:00Z"
  }
]

// Default hardcoded subscriptions parsed from mock data (fallback)
const DEFAULT_MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    name: "Netflix",
    price: 22.99,
    currency: "USD",
    frequency: "monthly",
    status: "active",
    renewalDate: "2026-07-01",
    category: "Entertainment",
    confidence: 1.0
  },
  {
    name: "ChatGPT Plus",
    price: 20.00,
    currency: "USD",
    frequency: "monthly",
    status: "active",
    renewalDate: "2026-06-28",
    category: "Software",
    confidence: 0.98
  },
  {
    name: "Canva Pro",
    price: 12.99,
    currency: "USD",
    frequency: "monthly",
    status: "trial",
    renewalDate: "2026-06-08",
    category: "Software",
    confidence: 0.95
  },
  {
    name: "Spotify Premium",
    price: 16.99,
    currency: "USD",
    frequency: "monthly",
    status: "active",
    renewalDate: "2026-06-30",
    category: "Entertainment",
    confidence: 1.0
  },
  {
    name: "Adobe Creative Cloud",
    price: 20.99,
    currency: "USD",
    frequency: "monthly",
    status: "active",
    renewalDate: "2026-06-15",
    category: "Software",
    confidence: 0.95
  },
  {
    name: "AWS",
    price: 14.50,
    currency: "USD",
    frequency: "monthly",
    status: "active",
    renewalDate: "2026-07-02",
    category: "Utilities",
    confidence: 0.90
  },
  {
    name: "GitHub Copilot",
    price: 10.00,
    currency: "USD",
    frequency: "monthly",
    status: "active",
    renewalDate: "2026-06-10",
    category: "Software",
    confidence: 1.0
  }
]

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash"
const TRANSIENT_GEMINI_STATUSES = new Set([429, 500, 502, 503, 504])

export async function POST(req: Request) {
  try {
    const session = await auth() as AuthSession | null
    const { searchParams } = new URL(req.url)
    const forceMock = searchParams.get("mock") === "true"

    // If token refresh failed, tell the client to re-authenticate
    if ((session as any)?.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        { success: false, error: "Your Google session has expired. Please sign in again to reconnect Gmail." },
        { status: 401 }
      )
    }

    // If user requests mock data or hasn't connected Google login with Gmail API
    if (forceMock || !session || !session.accessToken) {
      // Simulate network latency for scanner feel
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return NextResponse.json({
        success: true,
        source: "mock",
        subscriptions: DEFAULT_MOCK_SUBSCRIPTIONS,
        emailsScanned: MOCK_EMAILS.length
      })
    }

    const accessToken = session.accessToken
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    const gmail = google.gmail({ version: "v1", auth: oauth2Client })

    // Search query for subscription/billing related emails
    const query = "subject:(subscription OR trial OR payment OR receipt OR invoice OR renew OR \"trial ends\" OR \"billed\" OR \"cancel\")"
    
    // Fetch list of messages
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50
    })

    const messages = listRes.data.messages || []
    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        source: "gmail",
        subscriptions: [],
        emailsScanned: 0,
        message: "No subscription emails found in your inbox."
      })
    }

    // Fetch details for each message (concurrently, up to 25 to avoid hitting rate limits)
    const emailDataPromises: Promise<EmailSummary | null>[] = messages.slice(0, 25).map(async (msg) => {
      try {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id || "",
          format: "minimal" // returns headers and snippet, which is fast and lightweight
        })
        
        const headers = detail.data.payload?.headers || []
        const fromHeader = headers.find(h => h.name?.toLowerCase() === "from")?.value || "Unknown"
        const subjectHeader = headers.find(h => h.name?.toLowerCase() === "subject")?.value || "No Subject"
        const dateHeader = headers.find(h => h.name?.toLowerCase() === "date")?.value || ""

        return {
          id: msg.id,
          from: fromHeader,
          subject: subjectHeader,
          snippet: detail.data.snippet || "",
          date: dateHeader
        }
      } catch (err) {
        console.error(`Failed to get message ${msg.id}:`, err)
        return null
      }
    })

    const fetchedEmails = (await Promise.all(emailDataPromises)).filter(isEmailSummary)

    // Check if Gemini API key is configured
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found in environment. Falling back to local pattern-based parser.")
      // Fallback: local heuristic parsing from snippets
      const subscriptions = localParser(fetchedEmails)
      return NextResponse.json({
        success: true,
        source: "gmail_local_parsed",
        subscriptions,
        emailsScanned: fetchedEmails.length,
        warning: "Gemini API key missing. Used local rule-based parsing."
      })
    }

    // Prepare prompt for Gemini
    const emailSummaries = fetchedEmails.map((email, index) => {
      return `Email #${index + 1}:
From: ${email.from}
Subject: ${email.subject}
Snippet: ${email.snippet}
Date: ${email.date}
----------------------------------------`
    }).join("\n\n")

    const prompt = `
You are a financial AI analyzing a user's recent billing-related emails.
Your task is to identify recurring subscriptions, software trials, and recurring service bills from the email snippets below.

For each distinct service identified, parse:
1. Service Name (e.g. Netflix, Spotify, AWS, GitHub)
2. Amount (a number representing the cost)
3. Currency (e.g. USD, EUR, GBP)
4. Billing frequency (monthly, yearly, weekly, or one-time if it seems like a one-off purchase but related to a subscription setup)
5. Status (active, trial, or cancelled)
   - Mark as "trial" if the email indicates it's a free trial or has a "trial ends" deadline.
   - Mark as "cancelled" if the email explicitly confirms a cancellation.
   - Otherwise, mark as "active".
6. Renewal/Billing Date: The next date they will be billed (formatted as YYYY-MM-DD). If not explicitly mentioned, calculate it based on the email date + the billing frequency (e.g. if billed on May 15 monthly, next renewal is June 15).
7. Category (Entertainment, Software, Utilities, Health, Food, Other)
8. Confidence: A decimal from 0.0 to 1.0 representing how sure you are.

Avoid duplicate subscriptions for the same service. If you see multiple receipts for Netflix, only include one entry representing the active Netflix subscription (with the latest billing/renewal date).

Here is the email data:
${emailSummaries}
`

    const parsedResult = await parseWithGemini(apiKey, prompt, fetchedEmails)

    return NextResponse.json({
      success: true,
      source: parsedResult.source,
      subscriptions: parsedResult.subscriptions || [],
      emailsScanned: fetchedEmails.length,
      warning: parsedResult.warning
    })

  } catch (error: unknown) {
    console.error("Scraping error:", error)
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) || "An error occurred while scraping emails." },
      { status: 500 }
    )
  }
}

async function parseWithGemini(apiKey: string, prompt: string, fetchedEmails: EmailSummary[]): Promise<GeminiParseResult> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
  })

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              subscriptions: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING },
                    price: { type: SchemaType.NUMBER },
                    currency: { type: SchemaType.STRING },
                    frequency: { type: SchemaType.STRING, format: "enum", enum: ["monthly", "yearly", "weekly", "one-time"] },
                    status: { type: SchemaType.STRING, format: "enum", enum: ["active", "trial", "cancelled"] },
                    renewalDate: { type: SchemaType.STRING },
                    category: { type: SchemaType.STRING },
                    confidence: { type: SchemaType.NUMBER }
                  },
                  required: ["name", "price", "currency", "frequency", "status", "renewalDate", "category", "confidence"]
                }
              }
            },
            required: ["subscriptions"]
          }
        }
      })

      const text = result.response.text()
      const parsedResult = JSON.parse(text) as GeminiResponse

      return {
        source: "gmail_gemini",
        subscriptions: parsedResult.subscriptions || []
      }
    } catch (error: unknown) {
      const isLastAttempt = attempt === 2
      if (!isTransientGeminiError(error) || isLastAttempt) {
        console.warn("Gemini parsing unavailable. Falling back to local parser.", error)
        return {
          source: "gmail_local_parsed",
          subscriptions: localParser(fetchedEmails),
          warning: "Gemini is temporarily unavailable. Used local rule-based parsing instead."
        }
      }

      await sleep(750 * (attempt + 1))
    }
  }

  return {
    source: "gmail_local_parsed",
    subscriptions: localParser(fetchedEmails),
    warning: "Gemini is temporarily unavailable. Used local rule-based parsing instead."
  }
}

function isTransientGeminiError(error: unknown) {
  const status = Number(getErrorStatus(error))
  return TRANSIENT_GEMINI_STATUSES.has(status)
}

function getErrorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "status" in error) {
    return error.status
  }

  return undefined
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return undefined
}

function isEmailSummary(email: EmailSummary | null): email is EmailSummary {
  return email !== null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Simple rule-based parser fallback if Gemini API is missing
function localParser(emails: EmailSummary[]): Subscription[] {
  const subsMap = new Map<string, Subscription>()

  for (const email of emails) {
    const from = email.from.toLowerCase()
    const subject = email.subject.toLowerCase()
    const snippet = email.snippet.toLowerCase()
    const textToScan = `${from} ${subject} ${snippet}`

    let name = ""
    let category = "Other"

    // Heuristics for common subscriptions
    if (textToScan.includes("netflix")) {
      name = "Netflix"
      category = "Entertainment"
    } else if (textToScan.includes("spotify")) {
      name = "Spotify"
      category = "Entertainment"
    } else if (textToScan.includes("openai") || textToScan.includes("chatgpt")) {
      name = "ChatGPT Plus"
      category = "Software"
    } else if (textToScan.includes("canva")) {
      name = "Canva"
      category = "Software"
    } else if (textToScan.includes("adobe") || textToScan.includes("photoshop")) {
      name = "Adobe Creative Cloud"
      category = "Software"
    } else if (textToScan.includes("github") || textToScan.includes("copilot")) {
      name = "GitHub Copilot"
      category = "Software"
    } else if (textToScan.includes("aws") || textToScan.includes("amazon web services")) {
      name = "AWS"
      category = "Utilities"
    } else if (textToScan.includes("zoom")) {
      name = "Zoom"
      category = "Software"
    } else if (textToScan.includes("youtube")) {
      name = "YouTube Premium"
      category = "Entertainment"
    } else {
      // Extract brand from email domain
      const domainMatch = from.match(/@([a-z0-9-]+\.[a-z]{2,})/i)
      if (domainMatch && domainMatch[1]) {
        const brand = domainMatch[1].split(".")[0]
        name = brand.charAt(0).toUpperCase() + brand.slice(1)
      } else {
        continue
      }
    }

    // Try to extract price
    let price = 9.99 // default fallback
    const priceMatch = textToScan.match(/\$\s*(\d+(?:\.\d{2})?)/)
    if (priceMatch && priceMatch[1]) {
      price = parseFloat(priceMatch[1])
    }

    // Determine trial vs active
    const isTrial = textToScan.includes("trial") && !textToScan.includes("ended")
    const isCancelled = textToScan.includes("cancel") || textToScan.includes("cancelled")
    const status = isTrial ? "trial" : isCancelled ? "cancelled" : "active"

    // Determine renewal date (default 30 days from email date)
    const emailDate = email.date ? new Date(email.date) : new Date()
    const renewalDate = new Date(emailDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const renewalStr = renewalDate.toISOString().split("T")[0]

    const existing = subsMap.get(name)
    if (!existing || new Date(emailDate) > new Date(email.date)) {
      subsMap.set(name, {
        name,
        price,
        currency: "USD",
        frequency: "monthly",
        status,
        renewalDate: renewalStr,
        category,
        confidence: 0.7
      })
    }
  }

  return Array.from(subsMap.values())
}
