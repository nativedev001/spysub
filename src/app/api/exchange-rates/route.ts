import { NextResponse } from "next/server";

type Currency = "USD" | "EUR" | "GBP" | "PKR";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "PKR"];
const RATE_API_URL = "https://latest.currency-api.pages.dev/v1/currencies/usd.json";
const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  PKR: 285,
};

interface CurrencyApiResponse {
  date?: string;
  usd?: Partial<Record<string, number>>;
}

export async function GET() {
  try {
    const response = await fetch(RATE_API_URL, {
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) {
      throw new Error(`Rate API returned ${response.status}`);
    }

    const data = (await response.json()) as CurrencyApiResponse;
    const rates = CURRENCIES.reduce((nextRates, currency) => {
      const key = currency.toLowerCase();
      const value = data.usd?.[key];

      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new Error(`Missing ${currency} exchange rate`);
      }

      nextRates[currency] = value;
      return nextRates;
    }, {} as Record<Currency, number>);

    return NextResponse.json({
      success: true,
      base: "USD",
      asOf: data.date,
      source: "latest.currency-api.pages.dev",
      rates,
    });
  } catch (error) {
    console.error("Exchange rates error:", error);

    return NextResponse.json({
      success: false,
      base: "USD",
      source: "fallback",
      rates: FALLBACK_RATES,
      warning: "Live exchange rates are unavailable. Using fallback rates.",
    });
  }
}
