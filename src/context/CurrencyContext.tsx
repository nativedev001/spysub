"use client";
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import currencyJS from "currency.js";

export type Currency = "USD" | "EUR" | "GBP" | "PKR";

export const CURRENCIES: Currency[] = ["USD", "PKR", "EUR", "GBP"];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  PKR: "RS",
};

interface CurrencyContextProps {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  convert: (amount: number, from?: Currency, to?: Currency) => number;
  format: (amount: number, from?: Currency, to?: Currency) => string;
}

const CurrencyContext = createContext<CurrencyContextProps | undefined>(
  undefined,
);

export const useCurrency = (): CurrencyContextProps => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
};

const FALLBACK_EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  PKR: 285,
};

const RATE_CACHE_KEY = "subspy.exchangeRates.v1";

interface ExchangeRatesResponse {
  success: boolean;
  rates: Record<Currency, number>;
  asOf?: string;
}

function isRatesRecord(rates: unknown): rates is Record<Currency, number> {
  if (!rates || typeof rates !== "object") {
    return false;
  }

  return CURRENCIES.every((currency) => {
    const value = (rates as Partial<Record<Currency, unknown>>)[currency];
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  });
}

function getInitialExchangeRates() {
  if (typeof window === "undefined") {
    return FALLBACK_EXCHANGE_RATES;
  }

  const cached = window.localStorage.getItem(RATE_CACHE_KEY);
  if (!cached) {
    return FALLBACK_EXCHANGE_RATES;
  }

  try {
    const parsed = JSON.parse(cached) as Partial<ExchangeRatesResponse>;
    return isRatesRecord(parsed.rates) ? parsed.rates : FALLBACK_EXCHANGE_RATES;
  } catch {
    window.localStorage.removeItem(RATE_CACHE_KEY);
    return FALLBACK_EXCHANGE_RATES;
  }
}

export default function CurrencyProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD");
  const [exchangeRates, setExchangeRates] = useState(getInitialExchangeRates);

  useEffect(() => {
    let isMounted = true;

    async function loadExchangeRates() {
      try {
        const response = await fetch("/api/exchange-rates", {
          cache: "no-store",
        });
        const data = (await response.json()) as ExchangeRatesResponse;

        if (!isMounted || !isRatesRecord(data.rates)) {
          return;
        }

        setExchangeRates(data.rates);
        window.localStorage.setItem(
          RATE_CACHE_KEY,
          JSON.stringify({ rates: data.rates, asOf: data.asOf }),
        );
      } catch {
        // Keep cached/fallback rates so money displays never break the app.
      }
    }

    loadExchangeRates();

    return () => {
      isMounted = false;
    };
  }, []);

  const convert = (
    amount: number,
    from: Currency = "USD",
    to: Currency = selectedCurrency,
  ) => {
    const usdAmount = amount / exchangeRates[from];
    const converted = usdAmount * exchangeRates[to];
    return Number(currencyJS(converted, { precision: 2 }).value);
  };

  const format = (
    amount: number,
    from: Currency = "USD",
    to: Currency = selectedCurrency,
  ) => {
    const converted = convert(amount, from, to);
    const symbol = CURRENCY_SYMBOLS[to];

    return `${symbol} ${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency: selectedCurrency,
        setCurrency: setSelectedCurrency,
        convert,
        format,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
