import Link from "next/link";

const productLinks = [
  { href: "/about", label: "About" },
  { href: "/deals", label: "Deals" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms and Conditions" },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer border-t border-zinc-900/60 bg-black/90 text-sm text-slate-400">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-base font-bold text-white">SubSpy AI</p>
          <p className="mt-3 max-w-sm leading-6">
            Subscription clarity, trial tracking, savings guidance, and useful
            deals in one focused workspace.
          </p>
          <p className="mt-5 text-xs text-slate-600">
            &copy; 2026 SubSpy AI. All rights reserved.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Product
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {productLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Legal
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
