import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

interface Subscription {
  name: string
  price: number
  currency: string
  frequency: "monthly" | "yearly" | "weekly" | "one-time"
  status: "active" | "trial" | "cancelled"
  renewalDate: string
  category: string
}

interface SavingRecommendation {
  id: string
  title: string
  description: string
  savingAmount: number
  impact: "high" | "medium" | "low"
  category: "duplicate" | "trial" | "negotiate" | "downgrade" | "annual"
  actionPlan: string[]
  negotiationScript?: string
}

export async function POST(req: Request) {
  try {
    const { subscriptions } = await req.json()

    if (!subscriptions || !Array.isArray(subscriptions)) {
      return NextResponse.json(
        { success: false, error: "Subscriptions list is required." },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found. Using local recommendations fallback.")
      const recommendations = getLocalRecommendations(subscriptions)
      return NextResponse.json({
        success: true,
        source: "local_rules",
        recommendations
      })
    }

    // Call Gemini to generate smart recommendations
    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `
You are a brilliant financial advisor AI. You have been given a list of a user's subscriptions and trials:
${JSON.stringify(subscriptions, null, 2)}

Analyze this list and find concrete ways the user can save money. Generate 2 to 5 highly relevant recommendations.
Look for:
1. **Duplicate or Overlapping services** (e.g., Spotify and Apple Music, or multiple design platforms).
2. **Trials ending soon** (trials that will roll into paid subscriptions shortly).
3. **Switch to Annual** (services billed monthly where an annual plan typically saves 15-25%, e.g., SaaS tools like GitHub, Canva, Zoom).
4. **Negotiation opportunities** (e.g., telecom, hosting, or software where contacting support or trying to cancel prompts a discount). Provide a exact customer support chat script.
5. **Downgrade options** (e.g., premium plans that aren't necessary, like Netflix 4K if they only need standard).

Format the output strictly as a JSON object containing an array called "recommendations".
Each recommendation must match this schema:
- title: A short catchy title (e.g. "Switch Canva Pro to Annual")
- description: Detailed explanation of why and how they save (e.g. "Switching from Canva Monthly to Annual will save you $30/yr. Canva offers annual plans for...")
- savingAmount: The estimated savings per month in USD (as a number, e.g. 5.50)
- impact: "high" | "medium" | "low"
- category: "duplicate" | "trial" | "negotiate" | "downgrade" | "annual"
- actionPlan: Array of steps (e.g. ["Go to Canva Account settings", "Select Billing details", "Change plan to Annual"])
- negotiationScript: (Optional) A copy-pasteable script they can send to customer support if this is a "negotiate" category.
`

    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT" as any,
      properties: {
        recommendations: {
          type: "ARRAY" as any,
          items: {
            type: "OBJECT" as any,
            properties: {
              title: { type: "STRING" as any },
              description: { type: "STRING" as any },
              savingAmount: { type: "NUMBER" as any },
              impact: { type: "STRING" as any, enum: ["high", "medium", "low"] },
              category: { type: "STRING" as any, enum: ["duplicate", "trial", "negotiate", "downgrade", "annual"] },
              actionPlan: {
                type: "ARRAY" as any,
                items: { type: "STRING" as any }
              },
              negotiationScript: { type: "STRING" as any }
            },
            required: ["title", "description", "savingAmount", "impact", "category", "actionPlan"]
          }
        }
      },
      required: ["recommendations"]
    }
  }
});

    const text = result.response.text()
    const parsed = JSON.parse(text)

    // Inject unique IDs for frontend keys
    const recommendations = (parsed.recommendations || []).map((rec: any, idx: number) => ({
      ...rec,
      id: `ai-${idx}-${Date.now()}`
    }))

    return NextResponse.json({
      success: true,
      source: "gemini",
      recommendations
    })

  } catch (error: any) {
    console.error("Recommendations error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred while generating recommendations." },
      { status: 500 }
    )
  }
}

// Heuristics-based recommendation builder if Gemini is not configured
function getLocalRecommendations(subscriptions: Subscription[]): SavingRecommendation[] {
  const recommendations: SavingRecommendation[] = []

  // 1. Check for Active Trials
  const trials = subscriptions.filter(s => s.status === "trial")
  for (const trial of trials) {
    // Calculate days left
    const now = new Date("2026-06-05") // Fixed relative date for consistent mock sync
    const renewal = new Date(trial.renewalDate)
    const diffTime = renewal.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 7 && diffDays >= 0) {
      recommendations.push({
        id: `local-trial-${trial.name.toLowerCase()}`,
        title: `Cancel ${trial.name} Trial Before Charge`,
        description: `Your free trial for ${trial.name} ends in ${diffDays} day${diffDays === 1 ? "" : "s"} (on ${trial.renewalDate}). Unless you cancel, you will be billed ${trial.price.toFixed(2)} ${trial.currency} monthly.`,
        savingAmount: trial.price,
        impact: "high",
        category: "trial",
        actionPlan: [
          `Open your browser and navigate to ${trial.name} account settings.`,
          `Go to the "Billing" or "Subscription" section.`,
          `Click "Cancel Trial" or "Downgrade to Free" and confirm all prompt steps.`
        ]
      })
    }
  }

  // 2. Check for Potential Overlapping Services
  const entertainmentServices = subscriptions.filter(s => s.category === "Entertainment" && s.status === "active")
  if (entertainmentServices.length >= 3) {
    const totalEntertainmentSpend = entertainmentServices.reduce((sum, s) => sum + s.price, 0)
    recommendations.push({
      id: "local-entertainment-trim",
      title: "Consolidate Entertainment Subscriptions",
      description: `You have ${entertainmentServices.length} active entertainment subscriptions (${entertainmentServices.map(s => s.name).join(", ")}), spending ${totalEntertainmentSpend.toFixed(2)} USD/mo. Consider rotating these services based on show releases instead of running them simultaneously.`,
      savingAmount: 15.00,
      impact: "medium",
      category: "duplicate",
      actionPlan: [
        "Audit which streaming services you haven't watched in the last 2 weeks.",
        "Pause or cancel one service (e.g. Netflix or Disney+).",
        "Resubscribe only when a specific series you want to watch is released."
      ]
    })
  }

  // 3. Switch to Annual Recommendation
  const monthlySaaS = subscriptions.filter(s => 
    s.frequency === "monthly" && 
    s.status === "active" && 
    ["Software", "Utilities"].includes(s.category) &&
    s.price >= 10
  )
  for (const saas of monthlySaaS) {
    const annualSavingPerMonth = saas.price * 0.18 // Assume ~18% saving on annual
    recommendations.push({
      id: `local-annual-${saas.name.toLowerCase()}`,
      title: `Switch ${saas.name} to Annual Billing`,
      description: `You are currently paying for ${saas.name} monthly. Most tools offer a discount of 15% to 20% if you switch to an annual plan. This could save you approximately ${(annualSavingPerMonth * 12).toFixed(2)} USD per year.`,
      savingAmount: parseFloat(annualSavingPerMonth.toFixed(2)),
      impact: "medium",
      category: "annual",
      actionPlan: [
        `Log in to your ${saas.name} dashboard.`,
        `Go to Account settings > Billing & Plan.`,
        `Select "Switch to Annual" and complete the transaction (requires upfront payment, but saves in the long run).`
      ]
    })
  }

  // 4. Negotiate telecom/AWS bills
  const aws = subscriptions.find(s => s.name.toLowerCase().includes("aws") && s.status === "active")
  if (aws && aws.price > 10) {
    recommendations.push({
      id: "local-negotiate-aws",
      title: "Optimize AWS Infrastructure",
      description: `Your AWS monthly bill is $${aws.price.toFixed(2)}. AWS offers several free cost saving mechanisms like budget alerts, deleting unused volumes, or switching to Graviton instances.`,
      savingAmount: parseFloat((aws.price * 0.25).toFixed(2)),
      impact: "low",
      category: "negotiate",
      actionPlan: [
        "Enable AWS Budgets and set up an alert at 80% of expected spend.",
        "Open AWS Cost Explorer to view recommendation charts.",
        "Review and delete detached Elastic Block Store (EBS) volumes or unused Elastic IPs."
      ]
    })
  }

  // Add a generic fallback if no recommendations could be derived
  if (recommendations.length === 0) {
    recommendations.push({
      id: "local-generic-savings",
      title: "Perform a Subscription Audit",
      description: "Review all your active subscriptions and check if you have any overlapping tools. 84% of consumers underestimate their monthly subscription spending.",
      savingAmount: 10.00,
      impact: "medium",
      category: "duplicate",
      actionPlan: [
        "Log into your bank portal and export your statements for the last 90 days.",
        "Highlight any recurring charges that repeat every 30 days.",
        "Cancel any service you have not used in the last month."
      ]
    })
  }

  return recommendations
}
