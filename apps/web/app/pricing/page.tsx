"use client";

import Link from "next/link";
import { useState } from "react";
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

type BillingOption = {
  value: "monthly" | "yearly";
  label: string;
  subLabel: string;
};

type FeatureItem = {
  title: string;
  description: string;
};

type FaqItem = {
  question: string;
  content: string;
};

const billingOptions: BillingOption[] = [
  { value: "yearly", label: "Yearly (save 20%)", subLabel: "Lock in savings with an annual subscription" },
  { value: "monthly", label: "Monthly", subLabel: "Stay flexible with pay-as-you-go billing" },
];

const featureColumns: FeatureItem[][] = [
  [
    { title: "AI powered app building", description: "Rapidly generate complete web apps with guided AI workflows." },
    { title: "Integrated backend and database system", description: "Launch with authentication, storage, and APIs ready to scale." },
    { title: "Responsive visual editor", description: "Fine-tune layouts visually while AI maintains production-grade code." },
    { title: "Analytics dashboard", description: "Monitor adoption, retention, and performance in real time." },
    { title: "Multi-user editing and collaboration", description: "Invite teammates to ship faster with shared workspaces." },
  ],
  [
    { title: "Cloud storage", description: "Store files, media assets, and datasets with secure access controls." },
    { title: "Authentication and user management", description: "Protect experiences with built-in auth flows and user roles." },
    { title: "Payment processing", description: "Activate revenue streams through ready-to-use billing integrations." },
    { title: "Email marketing tools", description: "Trigger lifecycle campaigns and transactional emails natively." },
    { title: "Debugging and troubleshooting tools", description: "Trace issues instantly with observability and rollback tools." },
  ],
];

const faqItems: FaqItem[] = [
  {
    question: "What is VibeAny and how does it work?",
    content:
      '<p>VibeAny is an AI software engineer that helps anyone launch for the web. Chat with the assistant to instantly generate responsive websites and production-ready web apps—no prior knowledge of frameworks, build tools, or deployment pipelines required.</p>',
  },
  {
    question: "What does the free plan include?",
    content:
      '<p>The free plan grants 5 credits per day with a total allowance of 30 credits per month. For example, if you use all 5 credits every day for 6 days (30 credits total) you will reach the monthly cap and regain usage when the next billing cycle starts.</p>',
  },
  {
    question: "What is a credit?",
    content: `<div>
        <p class="mb-4">Credits measure how much AI-powered work VibeAny performs. Usage varies by mode:</p>
        <div class="mb-4">
          <p class="mb-2"><strong>Default Mode:</strong> dynamic pricing based on task complexity</p>
          <p class="mb-2"><strong>Chat Mode:</strong> 1 credit per message</p>
        </div>
        <p class="mb-4">Agent mode (the default as of July 23, 2025) reflects the real work completed instead of charging a flat rate, making most tasks more affordable:</p>
        <ul class="mb-4 ml-6 list-disc">
          <li>Many actions cost less than a single credit</li>
          <li>Edits accomplish more per request, improving efficiency</li>
        </ul>
        <p class="mb-4">Sample prompts and their typical credit usage:</p>
        <table class="mb-4 w-full border-collapse">
          <thead>
            <tr class="border-b">
              <th class="p-2 text-left">User prompt</th>
              <th class="p-2 text-left">Work completed</th>
              <th class="p-2 text-right">Credits</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b">
              <td class="p-2">“Make the button gray”</td>
              <td class="p-2">Updates button styles</td>
              <td class="p-2 text-right">0.50</td>
            </tr>
            <tr class="border-b">
              <td class="p-2">“Remove the footer”</td>
              <td class="p-2">Deletes the footer component</td>
              <td class="p-2 text-right">0.90</td>
            </tr>
            <tr class="border-b">
              <td class="p-2">“Add authentication with sign up and login”</td>
              <td class="p-2">Creates auth pages, logic, and updates routes</td>
              <td class="p-2 text-right">1.20</td>
            </tr>
            <tr class="border-b">
              <td class="p-2">“Build me a landing page, use images”</td>
              <td class="p-2">Generates a themed landing page with five sections and three images</td>
              <td class="p-2 text-right">1.70</td>
            </tr>
          </tbody>
        </table>
        <p class="mb-2">Hover the “more” icon in the conversation history to inspect the cost of each message.</p>
      </div>`,
  },
  {
    question: "What tech stacks does VibeAny know?",
    content:
      '<p>VibeAny ships front-ends with React, Tailwind, and Vite, and integrates with any backend that exposes an OpenAPI specification. Persistence and authentication are powered by Supabase (currently in alpha). <a href="https://docs.lovable.dev/#product-capabilities" target="_blank" class="underline">Learn more</a>.</p>',
  },
  {
    question: "Who owns the projects and code?",
    content:
      '<p>You retain full ownership. Collaborate within the workspace or clone the source from GitHub to continue building on your own infrastructure. <a href="https://docs.lovable.dev/features/git-integration/" target="_blank" class="underline">Learn more</a>.</p>',
  },
  {
    question: "How much does it cost to use?",
    content:
      '<p>Free users can create public projects and experiment with a limited credit allowance. Paid plans unlock private projects, higher credit quotas, and enterprise-grade capabilities. <a href="#pricing-section" class="underline">See pricing</a>.</p>',
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingOption["value"]>("monthly");
  const [expandedFaqIndexes, setExpandedFaqIndexes] = useState<number[]>(faqItems.map((_, index) => index));

  const toggleFaq = (index: number) => {
    setExpandedFaqIndexes((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index],
    );
  };

  const isFaqOpen = (index: number) => expandedFaqIndexes.includes(index);

  return (
    <div className="pricing-page-root min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-0 h-[480px] rounded-b-[80px] bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-400 opacity-80 blur-3xl" />
        </div>

        <section className="pricing-hero-section max-w-6xl mx-auto px-6 pt-36 pb-12 text-center text-white">
          <MotionH1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white"
            initial="hidden"
            animate="show"
            variants={fadeIn}
            custom={0}
          >
            Let dreams shine into reality
          </MotionH1>
          
          <MotionP
            className="mx-auto mt-4 max-w-3xl text-lg text-white"
            initial="hidden"
            animate="show"
            variants={fadeIn}
            custom={0.4}
          >
            Start for free. Upgrade to get the capacity that exactly matches your team's needs.
          </MotionP>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-12">
          <div className="rounded-[36px] border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-white/10 dark:bg-gray-900/70 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl space-y-2 text-left">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Choose your billing cycle</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Select yearly to capture 20% savings, or stay flexible with a monthly subscription.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 p-2 shadow-inner dark:border-white/10 dark:bg-white/5">
                {billingOptions.map((option) => {
                  const isActive = billingCycle === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setBillingCycle(option.value)}
                      className={`flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 text-white shadow-lg shadow-orange-400/40"
                          : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="flex flex-col leading-none">
                        <span>{option.label}</span>
                        <span className="mt-1 text-xs opacity-80">{option.subLabel}</span>
                      </span>
                      {option.value === "yearly" ? (
                        <span className="hidden h-6 w-6 items-center justify-center rounded-full bg-white/20 sm:flex">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M5 12h14M13 5l7 7-7 7"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span className="hidden h-6 w-6 items-center justify-center rounded-full bg-black/5 text-xs text-gray-500 sm:flex dark:bg-white/10 dark:text-gray-300">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="none"
                          >
                            <path
                              d="M12 5v14M5 12h14"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing-section" className="max-w-6xl mx-auto px-6 pb-24">
          <PricingPlansGrid withProviderSwitcher billingCycle={billingCycle} />
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="overflow-hidden rounded-[40px] border border-white/60 bg-gradient-to-br from-indigo-50/80 via-white/90 to-emerald-50/80 p-10 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-gray-900/80 dark:from-gray-900/70 dark:via-gray-900/80 dark:to-indigo-900/40">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr]">
              <div className="space-y-4">
                <MotionH2
                  className="text-left text-3xl font-semibold text-gray-900 dark:text-white"
                  initial="hidden"
                  animate="show"
                  variants={fadeIn}
                  custom={0}
                >
                  Eliminate costly, complex add-ons. Every VibeAny plan includes:
                  <span className="block text-base font-normal text-gray-600 dark:text-gray-300">
                    Skip endless integrations—core product, growth, and ops tools are bundled in every tier.
                  </span>
                </MotionH2>
                <p className="max-w-xl text-left text-sm text-gray-600 dark:text-gray-300">
                  From AI-assisted build flows to analytics and monetisation, every capability is ready out of the box so
                  teams can launch faster with lower overhead.
                </p>
              </div>
              <div className="flex flex-col items-start gap-4 rounded-3xl border border-white/70 bg-white/60 p-6 shadow-lg dark:border-white/10 dark:bg-gray-900/70">
                <span className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-600 dark:text-gray-300">
                  Seamless switching
                </span>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Swap between monthly and yearly plans without migration or downtime.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Role-based access, collaboration tools, and automation guardrails keep every team in sync.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {featureColumns.map((column, columnIndex) => (
                <div key={columnIndex} className="space-y-4">
                  {column.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 rounded-2xl border border-white/40 bg-white/70 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-gray-900/60"
                    >
                      <span className="mt-1 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">{item.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
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

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-[40px] border border-white/60 bg-gradient-to-br from-white/90 via-indigo-50/80 to-slate-100/60 p-10 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-gray-900/80 dark:from-gray-900/70 dark:via-gray-900/80 dark:to-slate-900/40">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <MotionH2
              className="text-left text-3xl font-semibold text-gray-900 dark:text-white"
              initial="hidden"
              animate="show"
              variants={fadeIn}
              custom={0}
            >
              FAQs
              <span className="block text-base font-normal text-gray-600 dark:text-gray-300">Frequently asked questions</span>
            </MotionH2>
            <p className="max-w-xl text-sm text-gray-600 dark:text-gray-300">
              Still need clarity? Chat with our support team or email support@vibeany.com—someone will respond within 24
              hours.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {faqItems.map((faq, index) => {
              const open = isFaqOpen(index);
              return (
                <div key={faq.question} className="border-b">
                  <h3>
                    <button
                      type="button"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between py-4 text-left text-xl font-medium transition-all hover:underline"
                    >
                      <span className="pr-6 text-gray-900 dark:text-white">{faq.question}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        className={`h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                      >
                        <path d="M9.47 6.47a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L13.94 12 9.47 7.53a.75.75 0 0 1 0-1.06" />
                      </svg>
                    </button>
                  </h3>
                  <div className={`overflow-hidden text-sm ${open ? 'block' : 'hidden'}`}>
                    <div
                      className="pb-4 pt-0 text-gray-700 dark:text-gray-200 [&_.underline]:underline [&_table]:border-collapse [&_table]:w-full [&_th]:text-left [&_th]:p-2 [&_td]:p-2 [&_tr]:border-b [&_strong]:font-semibold [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:text-inherit [&_a]:text-indigo-600 [&_a]:underline [&_a]:hover:text-indigo-500"
                      dangerouslySetInnerHTML={{ __html: faq.content }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/50 bg-white/80 p-6 shadow-inner dark:border-white/10 dark:bg-gray-900/80">
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">So, what are we building?</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Discover how teams launch faster with VibeAny.</p>
            </div>
            <Link
              href="https://app.base44.com/?utm_source=google&utm_medium=cpc&utm_campaign=22867479486%5E187469474390%5Esearch%20-%20wix&experiment_id=base44%5Ee%5E768258421102%5E&gad_source=1&gad_campaignid=22867479486&gbraid=0AAAAADwEfwVFd1FGXD3n0lQ065lzCbSXJ&gclid=Cj0KCQjwuKnGBhD5ARIsAD19RsYtto_sXB7z61JXJO4PuVlJUcPmzobC7u-7qqaLIZlruEU_agqnFvIaAsqvEALw_wcB"
              target="_self"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Start now
              <span className="text-xs text-white/80">Get moving in minutes</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="M5 12h14M13 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

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
