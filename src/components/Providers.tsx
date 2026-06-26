"use client";
import React from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CurrencyProvider from "@/context/CurrencyContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <SessionProvider>{children}</SessionProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}
