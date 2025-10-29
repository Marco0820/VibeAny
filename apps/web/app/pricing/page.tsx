"use client";

import Link from "next/link";
import { MotionH1, MotionH2, MotionH3, MotionP } from "@/lib/motion";
import { PricingPlansGrid } from "@/components/PricingPlansGrid";

const planColumns = [
  { key: "free", label: "Free" },
  { key: "pro", label: "Pro" },
  { key: "scale", label: "Scale" },
  { key: "enterprise", label: "Enterprise" },
] as const;

const allowanceMatrix = [
  {
    key: "bc",
    label: "Build Credits (BC)",
    tooltip: "BC power build and automation tasks such as Auto-fix, deployments, and CLI actions.",
    values: {
      free: "Daily auto-fix (1 BC · 3 uses)",
      pro: "400 / month · 1-cycle rollover",
      scale: "1,000 / month · 1-cycle rollover",
      enterprise: "Custom",
    },
  },
  {
    key: "rc",
    label: "Runtime Credits (RC)",
    tooltip: "RC cover long-running AI and runtime workloads including chat, agents, and generation.",
    values: {
      free: "On-demand top-ups",
      pro: "6,000 / month · 1-cycle rollover",
      scale: "12,000 / month · 1-cycle rollover",
      enterprise: "Custom",
    },
  },
  {
    key: "usage",
    label: "Usage Buffer",
    tooltip: "20% grace on metered usage (bandwidth, API calls, compute) before PAYG activates.",
    values: {
      free: "20% grace after card on file",
      pro: "20% of monthly metered baseline",
      scale: "20% of monthly metered baseline",
      enterprise: "Configured per contract",
    },
  },
] satisfies {
  key: string;
  label: string;
  tooltip: string;
  values: Record<(typeof planColumns)[number]["key"], string>;
}[];

const TooltipHint = ({ text }: { text: string }) => (
  <span
    className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-500 shadow-sm"
    title={text}
  >
    ?
  </span>
);

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
  }),
};

export default function PricingPage() {
  return (
    <div className="pricing-page-root min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-[480px] rounded-b-[80px] bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-400 opacity-80 blur-3xl" />
        </div>

        <section className="pricing-hero-section max-w-6xl mx-auto px-6 pt-24 pb-12 text-center text-indigo-600">
          <MotionH1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-indigo-600"
            initial="hidden"
            animate="show"
            variants={fadeIn}
            custom={0}
          >
            Unified Plans. 1 Day Trial.
          </MotionH1>
          <MotionH2
            className="mt-3 text-3xl sm:text-4xl font-semibold text-indigo-600"
            initial="hidden"
            animate="show"
            variants={fadeIn}
            custom={0.2}
          >
            <span className="inline-flex items-center justify-center rounded-xl bg-white/90 px-3 py-1 text-base font-medium uppercase tracking-wide text-indigo-600">
              PAYG Default On · BudgetGuard Ready
            </span>
          </MotionH2>
          <MotionP
            className="mx-auto mt-4 max-w-3xl text-lg text-indigo-600"
            initial="hidden"
            animate="show"
            variants={fadeIn}
            custom={0.4}
          >
            Choose Free, Pro, Scale, or Enterprise plans and keep automation, runtime, and usage credits aligned.
            PAYG charges kick in automatically with 20% grace, while BudgetGuard keeps your spend under control.
          </MotionP>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-24">
          <PricingPlansGrid withProviderSwitcher />
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="rounded-[36px] border border-white/60 bg-white/70 p-8 shadow-xl backdrop-blur dark:border-white/10 dark:bg-gray-900/70">
            <MotionH3
              className="text-left text-2xl font-semibold text-indigo-700 dark:text-indigo-200"
              initial="hidden"
              animate="show"
              variants={fadeIn}
              custom={0}
            >
              Credits & Usage Matrix
            </MotionH3>
            <MotionP
              className="mt-2 text-left text-sm text-indigo-600 dark:text-indigo-200/80"
              initial="hidden"
              animate="show"
              variants={fadeIn}
              custom={0.1}
            >
              BC drive builds & Auto-fix, RC power runtime actions, and metered usage enjoys a 20% allowance before PAYG.
              Tooltips spell out each resource so teams understand the guard rails.
            </MotionP>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-indigo-100 text-sm text-indigo-900 dark:divide-indigo-900/40 dark:text-indigo-100">
                <thead>
                  <tr>
                    <th className="py-3 pr-6 text-left font-semibold text-indigo-500">Allowance</th>
                    {planColumns.map((column) => (
                      <th key={column.key} className="py-3 px-4 text-left font-semibold text-indigo-500">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100 dark:divide-indigo-900/40">
                  {allowanceMatrix.map((row, rowIndex) => (
                    <tr key={row.key} className={rowIndex % 2 === 0 ? "bg-white/80 dark:bg-gray-900/40" : "bg-white/40 dark:bg-gray-900/20"}>
                      <td className="py-4 pr-6 font-medium text-indigo-700 dark:text-indigo-100">
                        <span className="inline-flex items-center">
                          {row.label}
                          <TooltipHint text={row.tooltip} />
                        </span>
                      </td>
                      {planColumns.map((column) => (
                        <td key={column.key} className="py-4 px-4 align-top text-sm text-indigo-900/90 dark:text-indigo-100/90">
                          {row.values[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-700 shadow-inner dark:bg-indigo-900/40 dark:text-indigo-100">
              PAYG is enabled for Pro, Scale, and Enterprise the moment plans activate. Set BudgetGuard thresholds from the Billing Dashboard and keep the 20% usage grace in mind before overage charges apply.
            </div>
          </div>
        </section>
      </div>

      <footer className="max-w-6xl mx-auto px-6 pb-16 text-sm text-gray-500 dark:text-gray-400">
        <div className="rounded-3xl bg-white/60 dark:bg-gray-900/70 border border-white/40 dark:border-white/10 p-8 backdrop-blur">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Need something custom?</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Contact our sales team to tailor a plan that fits your business. We also offer priority onboarding and design services.
          </p>
          <div className="mt-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
            >
              Talk to us
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
        <p className="mt-12 text-xs text-gray-400">
          © {new Date().getFullYear()} VibeAny. All rights reserved. Prices are shown in USD. Taxes may apply.
        </p>
      </footer>
    </div>
  );
}
