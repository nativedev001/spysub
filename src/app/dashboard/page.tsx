"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SiteFooter from "@/components/SiteFooter";
import { CURRENCIES, Currency, useCurrency } from "@/context/CurrencyContext";
import {
  Sparkles,
  LogOut,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Search,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Check,
  Info,
  Loader2,
  Download,
  BellRing,
  Target,
  ShieldCheck,
  Clock,
  Mail,
} from "lucide-react";

// Types matching API
interface Subscription {
  name: string;
  price: number;
  currency: string;
  frequency: "monthly" | "yearly" | "weekly" | "one-time";
  status: "active" | "trial" | "cancelled";
  renewalDate: string;
  category: string;
  confidence?: number;
}

interface SavingRecommendation {
  id: string;
  title: string;
  description: string;
  savingAmount: number;
  impact: "high" | "medium" | "low";
  category: "duplicate" | "trial" | "negotiate" | "downgrade" | "annual";
  actionPlan: string[];
  negotiationScript?: string;
}

const normalizeCurrency = (value: string): Currency => {
  return CURRENCIES.includes(value as Currency) ? (value as Currency) : "USD";
};

const loadStoredArray = <T,>(key: string): T[] => {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const loadStoredNumber = (key: string, fallback: number) => {
  if (typeof window === "undefined") return fallback;

  const saved = localStorage.getItem(key);
  const parsed = saved ? Number(saved) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createStorageKeys = (scope: string) => ({
  subscriptions: `subspy_${scope}_subscriptions`,
  recommendations: `subspy_${scope}_recommendations`,
  monthlyBudget: `subspy_${scope}_monthly_budget`,
});

const getDaysUntil = (date: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currency, setCurrency, convert, format } = useCurrency();
  const isDemoMode = searchParams.get("demo") === "true";
  const storageScope = useMemo(() => {
    if (isDemoMode) return "demo";
    if (status === "authenticated") {
      return `user_${encodeURIComponent(
        session?.user?.email || session?.user?.name || "account",
      )}`;
    }
    return "guest";
  }, [isDemoMode, session?.user?.email, session?.user?.name, status]);
  const storageKeys = useMemo(
    () => createStorageKeys(storageScope),
    [storageScope],
  );

  // Subscriptions State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [recommendations, setRecommendations] = useState<
    SavingRecommendation[]
  >([]);
  const [monthlyBudget, setMonthlyBudget] = useState(150);
  const [hasLoadedStoredState, setHasLoadedStoredState] = useState(false);

  // App UX States
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  // Table Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [activeTab, setActiveTab] = useState<
    "active" | "trials" | "cancelled" | "all"
  >("all");

  // Modals States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Modal Fields State
  const [subName, setSubName] = useState("");
  const [subPrice, setSubPrice] = useState("");
  const [subCurrency, setSubCurrency] = useState("USD");
  const [subFrequency, setSubFrequency] = useState<
    "monthly" | "yearly" | "weekly" | "one-time"
  >("monthly");
  const [subStatus, setSubStatus] = useState<"active" | "trial" | "cancelled">(
    "active",
  );
  const [subRenewalDate, setSubRenewalDate] = useState("");
  const [subCategory, setSubCategory] = useState("Entertainment");

  // Cancellation Guide State
  const [selectedCancelSub, setSelectedCancelSub] =
    useState<Subscription | null>(null);

  const displayAmount = useCallback(
    (amount: number, from: string) => {
      return format(amount, normalizeCurrency(from));
    },
    [format],
  );

  const convertToDisplayCurrency = useCallback(
    (amount: number, from: string) => {
      return convert(amount, normalizeCurrency(from));
    },
    [convert],
  );

  const getMonthlyCost = useCallback(
    (sub: Subscription) => {
      let monthlyCost = convertToDisplayCurrency(sub.price, sub.currency);
      if (sub.frequency === "yearly") monthlyCost = monthlyCost / 12;
      else if (sub.frequency === "weekly") monthlyCost = monthlyCost * 4.33;
      else if (sub.frequency === "one-time") monthlyCost = 0;

      return Number(monthlyCost.toFixed(2));
    },
    [convertToDisplayCurrency],
  );

  const displayMonthlyBudget = useMemo(() => {
    return convert(monthlyBudget, "USD", currency);
  }, [convert, monthlyBudget, currency]);

  // Scan Steps Descriptions
  const scanStepsText = [
    "Establishing secure OAuth connection...",
    "Searching recent emails for receipts and invoices...",
    "Downloading email header snippets...",
    "Sending subscription metadata to Gemini AI...",
    "Generating structural financial overview...",
  ];

  // Trigger AI Recommendations API
  const analyzeSubscriptions = useCallback(
    async (subsToAnalyze: Subscription[] = subscriptions) => {
      if (subsToAnalyze.length === 0) {
        setRecommendations([]);
        localStorage.removeItem(storageKeys.recommendations);
        return;
      }
      setIsAnalyzing(true);
      try {
        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptions: subsToAnalyze }),
        });
        const data = await response.json();
        if (data.success && data.recommendations) {
          setRecommendations(data.recommendations);
          localStorage.setItem(
            storageKeys.recommendations,
            JSON.stringify(data.recommendations),
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [storageKeys.recommendations, subscriptions],
  );

  // Trigger Scanner API (Live or Mock)
  const triggerScan = useCallback(
    async (forceMock: boolean = false) => {
      setIsScanning(true);
      setScanStep(0);
      setRecommendations([]);
      localStorage.removeItem(storageKeys.recommendations);

      // Simulate scanner step transitions for premium AI feel
      const stepInterval = setInterval(() => {
        setScanStep((prev) => {
          if (prev < scanStepsText.length - 1) return prev + 1;
          return prev;
        });
      }, 400);

      try {
        const endpoint =
          forceMock || isDemoMode ? "/api/scrape?mock=true" : "/api/scrape";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();

        clearInterval(stepInterval);

        if (response.status === 401) {
          // Google OAuth token expired and could not be refreshed — force re-login
          await signOut({ redirect: false });
          router.push("/?error=SessionExpired");
          return;
        }

        if (data.success && data.subscriptions) {
          setSubscriptions(data.subscriptions);
          localStorage.setItem(
            storageKeys.subscriptions,
            JSON.stringify(data.subscriptions),
          );

          // Auto-run analysis on fresh scan
          analyzeSubscriptions(data.subscriptions);
        } else {
          alert(data.error || "Failed to scan emails.");
        }
      } catch (err) {
        console.error(err);
        alert("Error scanning emails.");
      } finally {
        clearInterval(stepInterval);
        setIsScanning(false);
      }
    },
    [
      analyzeSubscriptions,
      isDemoMode,
      scanStepsText.length,
      storageKeys.recommendations,
      storageKeys.subscriptions,
    ],
  );

  // Load stored data for the current mode/account.
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" && !isDemoMode) return;

    setSubscriptions(loadStoredArray<Subscription>(storageKeys.subscriptions));
    setRecommendations(
      loadStoredArray<SavingRecommendation>(storageKeys.recommendations),
    );
    setMonthlyBudget(loadStoredNumber(storageKeys.monthlyBudget, 150));
    setHasLoadedStoredState(true);
  }, [isDemoMode, status, storageKeys]);

  // Initialize Subscriptions
  useEffect(() => {
    // If not authenticated and not demo, redirect to home
    if (status === "unauthenticated" && !isDemoMode) {
      router.push("/");
      return;
    }

    if (!hasLoadedStoredState || isScanning) return;

    // Auto-scan ONLY in demo mode (uses mock data, no real email access)
    if (isDemoMode && subscriptions.length === 0) {
      void Promise.resolve().then(() => triggerScan(true));
      return;
    }

    // Do NOT auto-scan real emails — the user must explicitly click "Scan My Inbox"
  }, [
    status,
    isDemoMode,
    router,
    subscriptions.length,
    triggerScan,
    hasLoadedStoredState,
    isScanning,
  ]);

  useEffect(() => {
    if (!hasLoadedStoredState) return;
    localStorage.setItem(storageKeys.monthlyBudget, monthlyBudget.toString());
  }, [hasLoadedStoredState, monthlyBudget, storageKeys.monthlyBudget]);

  // If NextAuth silently fails to refresh the Google token, sign out immediately
  // so the user can re-authenticate before hitting any API call.
  useEffect(() => {
    if ((session as any)?.error === "RefreshAccessTokenError") {
      signOut({ redirect: false }).then(() => {
        router.push("/?error=SessionExpired");
      });
    }
  }, [(session as any)?.error, router]);

  // Save / Add new manual subscription
  const handleAddSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName || !subPrice) return;

    const newSub: Subscription = {
      name: subName,
      price: parseFloat(subPrice),
      currency: subCurrency,
      frequency: subFrequency,
      status: subStatus,
      renewalDate: subRenewalDate || new Date().toISOString().split("T")[0],
      category: subCategory,
    };

    const updated = [newSub, ...subscriptions];
    setSubscriptions(updated);
    localStorage.setItem(storageKeys.subscriptions, JSON.stringify(updated));
    setIsAddModalOpen(false);

    // Clear forms
    resetForm();

    // Re-run recommendations
    analyzeSubscriptions(updated);
  };

  // Open edit modal and populate values
  const openEditModal = (idx: number) => {
    const sub = subscriptions[idx];
    setSubName(sub.name);
    setSubPrice(sub.price.toString());
    setSubCurrency(sub.currency);
    setSubFrequency(sub.frequency);
    setSubStatus(sub.status);
    setSubRenewalDate(sub.renewalDate);
    setSubCategory(sub.category);
    setEditingIndex(idx);
    setIsEditModalOpen(true);
  };

  // Save edited subscription
  const handleEditSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIndex === null || !subName || !subPrice) return;

    const updatedSub: Subscription = {
      name: subName,
      price: parseFloat(subPrice),
      currency: subCurrency,
      frequency: subFrequency,
      status: subStatus,
      renewalDate: subRenewalDate,
      category: subCategory,
    };

    const updated = [...subscriptions];
    updated[editingIndex] = updatedSub;
    setSubscriptions(updated);
    localStorage.setItem(storageKeys.subscriptions, JSON.stringify(updated));
    setIsEditModalOpen(false);
    setEditingIndex(null);
    resetForm();

    analyzeSubscriptions(updated);
  };

  // Delete subscription
  const handleDeleteSubscription = (idx: number) => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;
    const updated = subscriptions.filter((_, i) => i !== idx);
    setSubscriptions(updated);
    localStorage.setItem(storageKeys.subscriptions, JSON.stringify(updated));
    analyzeSubscriptions(updated);
  };

  const markSubscriptionCancelled = (idx: number) => {
    const sub = subscriptions[idx];
    if (!sub) return;

    const updated = [...subscriptions];
    updated[idx] = { ...sub, status: "cancelled" };
    setSubscriptions(updated);
    localStorage.setItem(storageKeys.subscriptions, JSON.stringify(updated));
    analyzeSubscriptions(updated);
  };

  const exportSubscriptionsCsv = () => {
    if (subscriptions.length === 0) return;

    const escapeCell = (value: string | number | undefined) => {
      const cell = String(value ?? "");
      return `"${cell.replace(/"/g, '""')}"`;
    };

    const rows = subscriptions.map((sub) => [
      sub.name,
      sub.price,
      sub.currency,
      sub.frequency,
      sub.status,
      sub.renewalDate,
      sub.category,
      getMonthlyCost(sub),
    ]);

    const csv = [
      [
        "Service",
        "Price",
        "Currency",
        "Frequency",
        "Status",
        "Renewal Date",
        "Category",
        `Monthly Cost (${currency})`,
      ],
      ...rows,
    ]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `subspy-subscriptions-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setSubName("");
    setSubPrice("");
    setSubCurrency("USD");
    setSubFrequency("monthly");
    setSubStatus("active");
    setSubRenewalDate("");
    setSubCategory("Entertainment");
  };

  // Copy negotiation script
  const copyScript = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScriptId(id);
    setTimeout(() => setCopiedScriptId(null), 2000);
  };

  // Financial Calculations
  const stats = useMemo(() => {
    let monthlySpend = 0;
    let activeCount = 0;
    let trialCount = 0;

    subscriptions.forEach((sub) => {
      if (sub.status === "cancelled") return;

      monthlySpend += getMonthlyCost(sub);

      if (sub.status === "active") {
        activeCount++;
      } else if (sub.status === "trial") {
        trialCount++;
      }
    });

    const yearlySpend = monthlySpend * 12;

    return {
      monthlySpend: parseFloat(monthlySpend.toFixed(2)),
      yearlySpend: parseFloat(yearlySpend.toFixed(2)),
      activeCount,
      trialCount,
    };
  }, [subscriptions, getMonthlyCost]);

  // Category Breakdown percentage calculation
  const categoriesBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    let total = 0;

    subscriptions.forEach((sub) => {
      if (sub.status === "cancelled") return;
      const monthlyCost = getMonthlyCost(sub);

      breakdown[sub.category] = (breakdown[sub.category] || 0) + monthlyCost;
      total += monthlyCost;
    });

    return Object.entries(breakdown)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [subscriptions, getMonthlyCost]);

  const budgetUsage = useMemo(() => {
    const percentage =
      displayMonthlyBudget > 0
        ? Math.round((stats.monthlySpend / displayMonthlyBudget) * 100)
        : 0;
    const remaining = displayMonthlyBudget - stats.monthlySpend;

    return {
      percentage,
      remaining,
      cappedPercentage: Math.min(percentage, 100),
      isOverBudget: remaining < 0,
    };
  }, [displayMonthlyBudget, stats.monthlySpend]);

  const upcomingRenewals = useMemo(() => {
    return subscriptions
      .map((sub, index) => ({
        sub,
        index,
        daysUntil: getDaysUntil(sub.renewalDate),
        monthlyCost: getMonthlyCost(sub),
      }))
      .filter(
        (item) =>
          item.sub.status !== "cancelled" &&
          item.daysUntil >= 0 &&
          item.daysUntil <= 30,
      )
      .sort(
        (a, b) => a.daysUntil - b.daysUntil || b.monthlyCost - a.monthlyCost,
      )
      .slice(0, 5);
  }, [subscriptions, getMonthlyCost]);

  const priorityActions = useMemo(() => {
    return subscriptions
      .map((sub, index) => {
        const daysUntil = getDaysUntil(sub.renewalDate);
        const monthlyCost = getMonthlyCost(sub);
        const isTrialRisk = sub.status === "trial" && daysUntil <= 7;
        const isRenewalRisk =
          sub.status === "active" && daysUntil >= 0 && daysUntil <= 7;
        const isHighSpend =
          monthlyCost >=
          Math.max(displayMonthlyBudget * 0.15, convert(15, "USD", currency));
        const score =
          (isTrialRisk ? 90 : 0) +
          (isRenewalRisk ? 70 : 0) +
          (isHighSpend ? 45 : 0) +
          Math.min(monthlyCost, 100);

        return {
          sub,
          index,
          daysUntil,
          monthlyCost,
          score,
          reason: isTrialRisk
            ? "Trial converts soon"
            : isRenewalRisk
              ? "Renews this week"
              : isHighSpend
                ? "High monthly impact"
                : "Review for overlap",
        };
      })
      .filter((item) => item.sub.status !== "cancelled" && item.score >= 45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [subscriptions, getMonthlyCost, displayMonthlyBudget, convert, currency]);

  const auditScore = useMemo(() => {
    if (subscriptions.length === 0) return 100;

    const overBudgetPenalty = budgetUsage.isOverBudget ? 22 : 0;
    const renewalPenalty = Math.min(upcomingRenewals.length * 5, 20);
    const trialPenalty = Math.min(stats.trialCount * 7, 21);
    const score = 100 - overBudgetPenalty - renewalPenalty - trialPenalty;

    return Math.max(score, 35);
  }, [
    subscriptions.length,
    budgetUsage.isOverBudget,
    upcomingRenewals.length,
    stats.trialCount,
  ]);

  // Subscriptions filtering logic
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      // Tab filter
      if (activeTab === "active" && sub.status !== "active") return false;
      if (activeTab === "trials" && sub.status !== "trial") return false;
      if (activeTab === "cancelled" && sub.status !== "cancelled") return false;

      // Search Filter
      if (
        searchQuery &&
        !sub.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;

      // Category Filter
      if (selectedCategory !== "All" && sub.category !== selectedCategory)
        return false;

      // Status Filter (secondary select)
      if (selectedStatus !== "All" && sub.status !== selectedStatus)
        return false;

      return true;
    });
  }, [subscriptions, searchQuery, selectedCategory, selectedStatus, activeTab]);

  // Helper colors for UI categories
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "entertainment":
        return "bg-pink-500/10 text-pink-400 border-pink-500/20";
      case "software":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "utilities":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "health":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "food":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  // Direct cancellation link lookup
  const getCancelLink = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (slug.includes("netflix")) return "https://www.netflix.com/youraccount";
    if (slug.includes("spotify"))
      return "https://www.spotify.com/account/subscription/";
    if (slug.includes("openai") || slug.includes("chatgpt"))
      return "https://chatgpt.com/";
    if (slug.includes("canva"))
      return "https://www.canva.com/settings/billing-and-plans";
    if (slug.includes("adobe")) return "https://account.adobe.com/plans";
    if (slug.includes("github")) return "https://github.com/settings/billing";
    if (slug.includes("aws"))
      return "https://console.aws.amazon.com/billing/home";
    return `https://google.com/search?q=how+to+cancel+${encodeURIComponent(name)}+subscription`;
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Background Radial Glow */}
      <div className="absolute top-0 right-[20%] w-[500px] h-[500px] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-900/5 blur-[150px] pointer-events-none" />

      {/* Top Navigation */}
      <nav className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between border-b border-zinc-900 bg-black/60 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center p-[1px]">
              <div className="w-full h-full bg-black rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <span className="font-bold text-lg text-white">SubSpy</span>
          </Link>

          {isDemoMode ? (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              Demo Mode
            </span>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Scraper Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            aria-label="Display currency"
          >
            {CURRENCIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {!isDemoMode && session?.user && (
            <div className="hidden sm:flex items-center gap-2.5">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt="User profile"
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full border border-zinc-800"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold">
                  {session.user.name?.charAt(0) ||
                    session.user.email?.charAt(0)}
                </div>
              )}
              <span className="text-sm text-slate-300 font-medium">
                {session.user.name || session.user.email}
              </span>
            </div>
          )}

          {isDemoMode ? (
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors duration-200 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors duration-200 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        {/* Left Side: Stats and Table (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Header Dashboard & Trigger Scan */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Your Financial Overview
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Audit active recurring charges, track trials, and maximize
                budget saving plans.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportSubscriptionsCsv}
                disabled={subscriptions.length === 0}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-slate-300 font-semibold hover:text-white hover:border-zinc-700 active:scale-95 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => triggerScan(isDemoMode)}
                disabled={isScanning}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:opacity-90 active:scale-95 transition-all duration-200 shadow-md shadow-indigo-500/10 text-sm disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`}
                />
                {isScanning
                  ? "Scanning Email..."
                  : isDemoMode
                    ? "Resimulate Scan"
                    : "Sync Email Inbox"}
              </button>
            </div>
          </div>

          {/* Banner warning if Demo Mode */}
          {isDemoMode && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-yellow-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
              <div className="flex gap-3 items-start">
                <Info className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Viewing Simulated Demonstration Data
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    To scan your own inbox, run the project locally, set your
                    Google OAuth and Gemini API keys in the `.env.local` file,
                    and connect your Google account.
                  </p>
                </div>
              </div>
              <Link
                href="/"
                className="text-xs font-semibold text-yellow-500 hover:text-yellow-400 shrink-0 hover:underline flex items-center gap-1"
              >
                Learn Setup <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Empty state — shown when authenticated but user hasn't scanned yet */}
          {!isDemoMode && status === "authenticated" && subscriptions.length === 0 && !isScanning && (
            <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 gap-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Mail className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Ready to scan your inbox?</h2>
                <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                  Click below to let SubSpy AI securely scan your Gmail for
                  subscription receipts, billing emails, and trial notices.
                  Nothing is stored on our servers.
                </p>
              </div>
              <button
                onClick={() => triggerScan(false)}
                disabled={isScanning}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:opacity-90 active:scale-95 transition-all duration-200 shadow-lg shadow-indigo-500/20 text-sm cursor-pointer disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                Scan My Inbox
              </button>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Secure OAuth 2.0 · Read-only Gmail access · No data stored
              </p>
            </div>
          )}

          {/* Hero Statistics Cards */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${!isDemoMode && subscriptions.length === 0 && !isScanning ? "hidden" : ""}`}>

            {/* Card 1: Monthly Spend */}
            <div className="rounded-2xl bg-zinc-950/65 border border-zinc-900 p-5 flex flex-col justify-between hover:border-zinc-800 transition-all duration-200">
              <div className="text-slate-500 text-xs font-medium flex items-center justify-between">
                <span>Monthly Recurring</span>
                <DollarSign className="w-4 h-4 text-slate-600" />
              </div>
              <div className="mt-4">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">
                  {format(stats.monthlySpend, currency, currency)}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Sum of active bills
                </span>
              </div>
            </div>

            {/* Card 2: Yearly Spend */}
            <div className="rounded-2xl bg-zinc-950/65 border border-zinc-900 p-5 flex flex-col justify-between hover:border-zinc-800 transition-all duration-200">
              <div className="text-slate-500 text-xs font-medium flex items-center justify-between">
                <span>Yearly Forecast</span>
                <TrendingUp className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="mt-4">
                <span className="text-2xl sm:text-3xl font-extrabold text-indigo-400">
                  {format(stats.yearlySpend, currency, currency)}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Based on monthly rate
                </span>
              </div>
            </div>

            {/* Card 3: Active Subscriptions */}
            <div
              className="rounded-2xl bg-zinc-950/65 border border-zinc-900 p-5 flex flex-col justify-between hover:border-zinc-800 transition-all duration-200 cursor-pointer"
              onClick={() => {
                setActiveTab("active");
                setSelectedStatus("active");
              }}
            >
              <div className="text-slate-500 text-xs font-medium flex items-center justify-between">
                <span>Active Plans</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-4">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                  {stats.activeCount}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Click to view active
                </span>
              </div>
            </div>

            {/* Card 4: Ending Trials */}
            <div
              className="rounded-2xl bg-zinc-950/65 border border-zinc-900 p-5 flex flex-col justify-between hover:border-zinc-800 transition-all duration-200 cursor-pointer"
              onClick={() => {
                setActiveTab("trials");
                setSelectedStatus("trial");
              }}
            >
              <div className="text-slate-500 text-xs font-medium flex items-center justify-between">
                <span>Active Free Trials</span>
                <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
              </div>
              <div className="mt-4">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">
                  {stats.trialCount}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Alerting trials
                </span>
              </div>
            </div>
          </div>

          {/* Action Center */}
          <div className="rounded-2xl bg-zinc-950/65 border border-zinc-900 p-5 flex flex-col gap-4 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Action Center
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Prioritized renewals, trials, and high-impact plans.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
                <span className="text-xs text-slate-500">Audit score</span>
                <span
                  className={`text-sm font-extrabold ${auditScore >= 80 ? "text-emerald-400" : auditScore >= 60 ? "text-amber-400" : "text-red-400"}`}
                >
                  {auditScore}
                </span>
              </div>
            </div>

            {priorityActions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center text-xs text-slate-500">
                No urgent actions right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {priorityActions.map(
                  ({ sub, index, daysUntil, monthlyCost, reason }) => (
                    <div
                      key={`${sub.name}-${index}`}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/45 p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">
                            {sub.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {reason}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 shrink-0">
                          {format(monthlyCost, currency, currency)}/mo
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[11px] font-semibold ${daysUntil <= 3 ? "text-red-400" : daysUntil <= 7 ? "text-amber-400" : "text-slate-400"}`}
                        >
                          {daysUntil < 0
                            ? "Date passed"
                            : `${daysUntil} day${daysUntil === 1 ? "" : "s"} left`}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedCancelSub(sub)}
                            className="text-xs text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 font-semibold cursor-pointer"
                          >
                            Cancel Help
                          </button>
                          <button
                            onClick={() => markSubscriptionCancelled(index)}
                            className="text-xs text-emerald-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-semibold cursor-pointer"
                          >
                            Mark Done
                          </button>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="rounded-2xl bg-zinc-950/65 border border-zinc-900 overflow-hidden backdrop-blur-sm">
            {/* Table Navigation and Filters */}
            <div className="px-6 py-4 border-b border-zinc-900 flex flex-col gap-4">
              {/* Tab Navigation */}
              <div className="flex border-b border-zinc-900 gap-6 text-sm font-medium">
                {(["all", "active", "trials", "cancelled"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        if (tab === "all") setSelectedStatus("All");
                        else if (tab === "active") setSelectedStatus("active");
                        else if (tab === "trials") setSelectedStatus("trial");
                        else if (tab === "cancelled")
                          setSelectedStatus("cancelled");
                      }}
                      className={`pb-3 capitalize border-b-2 cursor-pointer transition-colors duration-200 ${
                        activeTab === tab
                          ? "border-emerald-500 text-white font-bold"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab === "trials" ? "trials & Alerts" : tab}
                    </button>
                  ),
                )}
              </div>

              {/* Filters & Add Button */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search merchant name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-zinc-900/60 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Software">Software</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Health">Health</option>
                      <option value="Food">Food</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 text-black font-bold hover:bg-emerald-400 text-xs transition-colors duration-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Add Plan
                  </button>
                </div>
              </div>
            </div>

            {/* Subscriptions Grid/Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-xs text-slate-500 uppercase bg-zinc-900/20">
                    <th className="py-4 px-6 font-semibold">Service</th>
                    <th className="py-4 px-6 font-semibold">Cost</th>
                    <th className="py-4 px-6 font-semibold">Cycle</th>
                    <th className="py-4 px-6 font-semibold">Status</th>
                    <th className="py-4 px-6 font-semibold">
                      Next Bill / Renewal
                    </th>
                    <th className="py-4 px-6 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-slate-500 text-sm"
                      >
                        No subscriptions found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSubscriptions.map((sub, idx) => {
                      // Calculate global index in main array for edit callbacks
                      const originalIndex = subscriptions.findIndex(
                        (s) =>
                          s.name === sub.name &&
                          s.price === sub.price &&
                          s.renewalDate === sub.renewalDate,
                      );

                      return (
                        <tr
                          key={sub.name + idx}
                          className="hover:bg-zinc-900/30 transition-colors duration-150 group"
                        >
                          {/* Name & Category */}
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                {sub.name}
                              </span>
                              <span
                                className={`inline-block border px-1.5 py-0.5 rounded text-[10px] w-fit font-semibold mt-1.5 ${getCategoryColor(sub.category)}`}
                              >
                                {sub.category}
                              </span>
                            </div>
                          </td>
                          {/* Price */}
                          <td className="py-4 px-6 font-medium text-white">
                            {displayAmount(sub.price, sub.currency)}{" "}
                            <span className="text-[10px] text-slate-500">
                              from {sub.currency}
                            </span>
                          </td>
                          {/* Frequency */}
                          <td className="py-4 px-6 text-slate-400 capitalize text-xs">
                            {sub.frequency}
                          </td>
                          {/* Status */}
                          <td className="py-4 px-6">
                            {sub.status === "active" && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{" "}
                                Active
                              </span>
                            )}
                            {sub.status === "trial" && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />{" "}
                                Free Trial
                              </span>
                            )}
                            {sub.status === "cancelled" && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/10">
                                Cancelled
                              </span>
                            )}
                          </td>
                          {/* Renewal Date */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-xs">{sub.renewalDate}</span>
                            </div>
                          </td>
                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            <div className="flex gap-2 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                              {sub.status !== "cancelled" && (
                                <button
                                  onClick={() => setSelectedCancelSub(sub)}
                                  className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 font-medium cursor-pointer"
                                  title="How to Cancel"
                                >
                                  Cancel Help
                                </button>
                              )}
                              <button
                                onClick={() => openEditModal(originalIndex)}
                                className="text-slate-400 hover:text-white p-1 rounded hover:bg-zinc-800 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteSubscription(originalIndex)
                                }
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Charts & AI Advisor Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* Budget Guardrail */}
          <div className="rounded-2xl bg-zinc-950/65 border border-zinc-900 p-6 flex flex-col gap-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  Budget Guardrail
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Recurring spend against your monthly limit
                </p>
              </div>
              <span
                className={`text-xs font-extrabold px-2 py-1 rounded-lg border ${
                  budgetUsage.isOverBudget
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                {budgetUsage.percentage}%
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Monthly limit ({currency})
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={Math.round(displayMonthlyBudget)}
                  onChange={(e) => {
                    const nextBudget = Math.max(1, Number(e.target.value) || 1);
                    setMonthlyBudget(convert(nextBudget, currency, "USD"));
                  }}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="text-right pb-2">
                <p className="text-[10px] text-slate-500 uppercase font-bold">
                  Current
                </p>
                <p className="text-sm font-extrabold text-white">
                  {format(stats.monthlySpend, currency, currency)}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="h-2.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${budgetUsage.isOverBudget ? "bg-red-500" : "bg-cyan-400"}`}
                  style={{ width: `${budgetUsage.cappedPercentage}%` }}
                />
              </div>
              <p
                className={`text-xs ${budgetUsage.isOverBudget ? "text-red-400" : "text-slate-400"}`}
              >
                {budgetUsage.isOverBudget
                  ? `${format(Math.abs(budgetUsage.remaining), currency, currency)} over your monthly guardrail`
                  : `${format(budgetUsage.remaining, currency, currency)} left before your guardrail`}
              </p>
            </div>
          </div>

          {/* Renewal Queue */}
          <div className="rounded-2xl bg-zinc-950/65 border border-zinc-900 p-6 flex flex-col gap-5 backdrop-blur-sm">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-amber-400" />
                  Renewal Queue
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Charges coming up in the next 30 days
                </p>
              </div>
              <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                {upcomingRenewals.length}
              </span>
            </div>

            {upcomingRenewals.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">
                No upcoming renewals found.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingRenewals.map(
                  ({ sub, index, daysUntil, monthlyCost }) => (
                    <div
                      key={`${sub.name}-renewal-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900/45 border border-zinc-800 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {sub.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {daysUntil === 0
                            ? "Today"
                            : `${daysUntil} day${daysUntil === 1 ? "" : "s"}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-extrabold text-white">
                          {format(monthlyCost, currency, currency)}
                        </p>
                        <button
                          onClick={() => setSelectedCancelSub(sub)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Category Breakdown Spending Ring */}
          <div className="rounded-2xl bg-zinc-950/65 border border-zinc-900 p-6 flex flex-col gap-6 backdrop-blur-sm">
            <div>
              <h3 className="text-lg font-bold text-white">
                Monthly Categories
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Distribution of recurring spending
              </p>
            </div>

            {/* Custom Horizontal Visual Breakdown Chart */}
            <div className="flex flex-col gap-4">
              {categoriesBreakdown.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-6">
                  No active subscriptions to chart.
                </p>
              ) : (
                categoriesBreakdown.map((cat) => (
                  <div key={cat.name} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{cat.name}</span>
                      <span className="text-white">
                        {format(cat.value, currency, currency)}{" "}
                        <span className="text-[10px] text-slate-500">
                          ({cat.percentage}%)
                        </span>
                      </span>
                    </div>
                    {/* Glowing progress line */}
                    <div className="w-full h-2.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${
                          cat.name === "Entertainment"
                            ? "from-pink-500 to-rose-400"
                            : cat.name === "Software"
                              ? "from-indigo-500 to-purple-400"
                              : cat.name === "Utilities"
                                ? "from-cyan-500 to-blue-400"
                                : cat.name === "Health"
                                  ? "from-emerald-500 to-teal-400"
                                  : cat.name === "Food"
                                    ? "from-amber-500 to-yellow-400"
                                    : "from-slate-500 to-slate-400"
                        }`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-zinc-900 text-center text-xs text-slate-400">
              Annual budget allocation mapping completed.
            </div>
          </div>

          {/* AI recommendations Savings Advisor */}
          <div className="rounded-2xl bg-zinc-950/65 border border-zinc-900 flex h-[620px] max-h-[calc(100vh-7rem)] min-h-[520px] flex-col backdrop-blur-sm relative overflow-hidden">
            {/* Top Title */}
            <div className="shrink-0 p-6 pb-4 flex justify-between items-center gap-4 border-b border-zinc-900">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                  <Sparkles
                    className="w-4 h-4 text-emerald-400 animate-spin"
                    style={{ animationDuration: "4s" }}
                  />
                  Savings Advisor
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  AI powered budget optimization
                </p>
              </div>

              <button
                onClick={() => analyzeSubscriptions()}
                disabled={isAnalyzing || subscriptions.length === 0}
                className="shrink-0 text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Analyzing
                  </>
                ) : (
                  <>Re-Analyze</>
                )}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:#3f3f46_#09090b]">
              {isAnalyzing ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <span className="text-xs font-semibold">
                    Gemini is auditing overlapping scopes...
                  </span>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="h-full text-center text-slate-500 border border-dashed border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
                  <Info className="w-6 h-6 text-slate-600" />
                  <p className="text-xs font-medium">No advice computed yet.</p>
                  <button
                    onClick={() => analyzeSubscriptions()}
                    disabled={subscriptions.length === 0}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    Click to run AI audit
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pb-1">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-xl bg-zinc-900/55 border border-zinc-800/90 relative overflow-hidden flex flex-col gap-3 group/rec hover:border-emerald-500/25 transition-colors"
                    >
                      {/* Recommendation Title & saving amount */}
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-4">
                          <span className="inline-block text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-zinc-800 text-slate-400 tracking-wider mb-1">
                            {rec.category}
                          </span>
                          <h4 className="text-sm font-bold text-white leading-snug">
                            {rec.title}
                          </h4>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-xs text-emerald-400 font-extrabold">
                            +{format(rec.savingAmount, "USD")}
                          </span>
                          <span className="text-[9px] text-slate-500 block">
                            /mo
                          </span>
                        </div>
                      </div>

                      {/* Recommendation Description */}
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {rec.description}
                      </p>

                      {/* Action Checklist */}
                      <div className="pt-3 border-t border-zinc-800/70 flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Plan of Action:
                        </span>
                        <ul className="flex flex-col gap-1">
                          {rec.actionPlan.map((step, sidx) => (
                            <li
                              key={sidx}
                              className="text-xs text-slate-300 flex items-start gap-1.5"
                            >
                              <span className="text-emerald-500 text-[10px] font-extrabold mt-0.5">
                                ✓
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Negotiation Copy Script */}
                      {rec.negotiationScript && (
                        <div className="mt-2 flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            AI Negotiation Script:
                          </span>
                          <div className="relative p-2.5 rounded-lg bg-black/60 border border-zinc-800 text-[10px] text-slate-400 leading-normal max-h-28 overflow-y-auto font-mono [scrollbar-width:thin]">
                            {rec.negotiationScript}
                            <button
                              onClick={() =>
                                copyScript(rec.negotiationScript || "", rec.id)
                              }
                              className="absolute right-2 top-2 p-1.5 rounded bg-zinc-900 border border-zinc-800 text-slate-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                            >
                              {copiedScriptId === rec.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Potential Total Savings Summary Card */}
            {recommendations.length > 0 && (
              <div className="shrink-0 m-4 mt-0 p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20 text-center">
                <span className="text-xs text-slate-300">
                  Potential annual savings:{" "}
                </span>
                <span className="text-base font-extrabold text-emerald-400">
                  {format(
                    recommendations.reduce(
                      (sum, r) => sum + r.savingAmount,
                      0,
                    ) * 12,
                    "USD",
                  )}
                  /yr
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <SiteFooter />

      {/* ========================================== */}
      {/* 1. NEW SUBSCRIPTION MODAL */}
      {/* ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 flex flex-col gap-6 shadow-2xl relative">
            <div>
              <h3 className="text-xl font-bold text-white">
                Add Recurring Plan
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Manually record a subscription payment.
              </p>
            </div>

            <form
              onSubmit={handleAddSubscription}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ChatGPT, Netflix, Prime"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Cost (Price)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="19.99"
                    value={subPrice}
                    onChange={(e) => setSubPrice(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Currency
                  </label>
                  <select
                    value={subCurrency}
                    onChange={(e) => setSubCurrency(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {CURRENCIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Category
                </label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Entertainment">Entertainment</option>
                  <option value="Software">Software</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Health">Health</option>
                  <option value="Food">Food</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Billing Cycle
                  </label>
                  <select
                    value={subFrequency}
                    onChange={(e) =>
                      setSubFrequency(
                        e.target.value as Subscription["frequency"],
                      )
                    }
                    className="bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-time charge</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Status
                  </label>
                  <select
                    value={subStatus}
                    onChange={(e) =>
                      setSubStatus(e.target.value as Subscription["status"])
                    }
                    className="bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Free Trial</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Next Billing/Renewal Date
                </label>
                <input
                  type="date"
                  value={subRenewalDate}
                  onChange={(e) => setSubRenewalDate(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded bg-zinc-900 border border-zinc-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs text-black font-extrabold rounded bg-emerald-500 hover:bg-emerald-400 transition-colors cursor-pointer"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. EDIT SUBSCRIPTION MODAL */}
      {/* ========================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 flex flex-col gap-6 shadow-2xl relative">
            <div>
              <h3 className="text-xl font-bold text-white">Edit Plan</h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Modify subscription parameters.
              </p>
            </div>

            <form
              onSubmit={handleEditSubscription}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Netflix"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Cost (Price)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="14.99"
                    value={subPrice}
                    onChange={(e) => setSubPrice(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Currency
                  </label>
                  <select
                    value={subCurrency}
                    onChange={(e) => setSubCurrency(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {CURRENCIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Category
                </label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Entertainment">Entertainment</option>
                  <option value="Software">Software</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Health">Health</option>
                  <option value="Food">Food</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Billing Cycle
                  </label>
                  <select
                    value={subFrequency}
                    onChange={(e) =>
                      setSubFrequency(
                        e.target.value as Subscription["frequency"],
                      )
                    }
                    className="bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-time charge</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">
                    Status
                  </label>
                  <select
                    value={subStatus}
                    onChange={(e) =>
                      setSubStatus(e.target.value as Subscription["status"])
                    }
                    className="bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Free Trial</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Next Billing/Renewal Date
                </label>
                <input
                  type="date"
                  value={subRenewalDate}
                  onChange={(e) => setSubRenewalDate(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingIndex(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded bg-zinc-900 border border-zinc-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs text-black font-extrabold rounded bg-emerald-500 hover:bg-emerald-400 transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. CANCELLATION HELPER MODAL */}
      {/* ========================================== */}
      {selectedCancelSub && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 flex flex-col gap-5 shadow-2xl relative">
            <div>
              <h3 className="text-lg font-bold text-white">
                Cancel {selectedCancelSub.name}
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Quick guides and templates to stop billing cycles.
              </p>
            </div>

            {/* Direct cancel link */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-400">
                1. Instant Portal Link
              </span>
              <a
                href={getCancelLink(selectedCancelSub.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-lg bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-400 transition-colors"
              >
                Go to {selectedCancelSub.name} Billing Portal{" "}
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            {/* Copy-paste cancel email template */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-900">
              <span className="text-xs font-semibold text-slate-400">
                2. Cancellation Email Draft
              </span>
              <div className="relative p-3 rounded bg-black/60 border border-zinc-800 text-[10px] text-slate-300 leading-relaxed font-mono max-h-40 overflow-y-auto">
                Subject: Cancel Subscription - Account: [Your Email]
                <br />
                <br />
                Hello customer support,
                <br />
                <br />I am writing to request the cancellation of my
                subscription/membership for {selectedCancelSub.name}.
                <br />
                <br />
                Please verify that no further recurring payments of{" "}
                {displayAmount(
                  selectedCancelSub.price,
                  selectedCancelSub.currency,
                )}{" "}
                will be charged to my payment method.
                <br />
                <br />
                Thank you,
                <br />
                [Your Name]
                <button
                  onClick={() => {
                    const text = `Subject: Cancel Subscription - Account: [Your Email]\n\nHello customer support,\n\nI am writing to request the cancellation of my subscription/membership for ${selectedCancelSub.name}.\n\nPlease verify that no further recurring payments of ${displayAmount(selectedCancelSub.price, selectedCancelSub.currency)} will be charged to my payment method.\n\nThank you,\n[Your Name]`;
                    navigator.clipboard.writeText(text);
                    alert("Draft copied to clipboard!");
                  }}
                  className="absolute right-2 top-2 p-1.5 rounded bg-zinc-900 border border-zinc-800 text-slate-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                  title="Copy Draft"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedCancelSub(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded bg-zinc-900 border border-zinc-800 font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. SCAN LOADER MODAL (DURING ACTIVE SCRAPE) */}
      {/* ========================================== */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
            {/* Spinning glowing loader icon */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-emerald-500 animate-spin" />
              <div
                className="absolute inset-2 rounded-full border-4 border-emerald-500/10 border-t-indigo-500 animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1.2s",
                }}
              />
              <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-white">
                SubSpy Scanning Engine
              </h3>
              <p className="text-xs text-slate-400 max-w-xs transition-all duration-300 h-10 px-2 leading-relaxed">
                {scanStepsText[scanStep]}
              </p>
            </div>

            {/* Small status dots indicator */}
            <div className="flex gap-1.5">
              {scanStepsText.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === scanStep
                      ? "w-4 bg-emerald-400"
                      : i < scanStep
                        ? "bg-indigo-500"
                        : "bg-zinc-800"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="text-xs text-slate-400">
            Loading SubSpy Engine...
          </span>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
