'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { PAYMENT_PROVIDERS, PRICING_PLANS } from '@/constants/pricing';
import { MotionDiv } from '@/lib/motion';

type BillingCycle = 'monthly' | 'yearly';

type PricingPlansGridProps = {
  withProviderSwitcher?: boolean;
  className?: string;
  billingCycle?: BillingCycle;
};

const BILLING_DISCOUNT = 0.2;

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: 'easeOut' },
  }),
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPrice(monthlyPrice: number, cycle: BillingCycle) {
  if (monthlyPrice === 0) {
    return {
      label: '$0',
      sub: cycle === 'yearly' ? '年付免费' : '永久免费基础功能',
    };
  }

  if (cycle === 'monthly') {
    return {
      label: `${currencyFormatter.format(monthlyPrice)}/mo`,
      sub: '按月计费，可随时升级',
    };
  }

  const annualPrice = monthlyPrice * 12 * (1 - BILLING_DISCOUNT);
  const savedAmount = monthlyPrice * 12 - annualPrice;

  return {
    label: `${currencyFormatter.format(annualPrice)}/yr`,
    sub: `年付立减 ${currencyFormatter.format(savedAmount)}（节省 20%）`,
  };
}

export function PricingPlansGrid({
  withProviderSwitcher = false,
  className,
  billingCycle = 'monthly',
}: PricingPlansGridProps) {
  const planCards = useMemo(() => PRICING_PLANS, []);
  const [provider, setProvider] = useState(PAYMENT_PROVIDERS[0]?.id ?? 'creem');
  const [featureSelections, setFeatureSelections] = useState<Record<string, boolean[]>>(() =>
    Object.fromEntries(planCards.map((plan) => [plan.id, plan.features.map((feature) => feature.included)])),
  );

  const toggleFeature = (planId: string, index: number) => {
    setFeatureSelections((prev) => {
      const current = prev[planId] ? [...prev[planId]] : [];
      current[index] = !current[index];
      return { ...prev, [planId]: current };
    });
  };

  return (
    <div className={clsx('flex w-full flex-col gap-10', className)}>
      {/*
        Temporarily disabled provider switcher
        {withProviderSwitcher && (
          <MotionDiv
            className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-indigo-50/90"
            initial="hidden"
            animate="show"
            variants={fadeIn}
            custom={0}
          >
            <span>Select payment provider:</span>
            <div className="flex gap-1 rounded-full bg-white/10 p-1">
              {PAYMENT_PROVIDERS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setProvider(item.id)}
                  className={clsx(
                    'px-3 py-1 text-xs font-medium transition-all duration-200 rounded-full',
                    provider === item.id ? 'bg-white text-indigo-600 shadow' : 'text-indigo-50 hover:bg-white/20',
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </MotionDiv>
        )}
      */}

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
        {planCards.map((plan, index) => (
          <MotionDiv
            key={plan.id}
            custom={index}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            whileHover={{ scale: 1.03, translateY: -8 }}
            whileTap={{ scale: 0.98 }}
            style={{ transformStyle: 'preserve-3d', transform: 'translate3d(0px, 0px, 0px) scale3d(1, 1, 1)' }}
            className={clsx(
              'relative rounded-[32px] p-[1px]',
              plan.primary
                ? 'bg-gradient-to-br from-indigo-400 via-purple-500 to-sky-400'
                : 'bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5',
            )}
          >
            <div
              className={clsx(
                'flex h-full flex-col rounded-[32px] p-8 shadow-xl',
                plan.primary
                  ? 'bg-gradient-to-br from-indigo-500 via-purple-600 to-sky-500 text-white'
                  : 'bg-white/80 backdrop-blur dark:bg-gray-900/70',
              )}
              style={{ transformStyle: 'preserve-3d', transform: 'translate3d(0px, 0px, 0px) scale3d(1, 1, 1)' }}
            >
              {plan.primary && (
                <span className="text-xs uppercase tracking-[0.4em] text-white/70">Most Popular</span>
              )}
              <h3
                className={clsx(
                  'mt-2 text-2xl font-semibold',
                  plan.primary ? 'text-white' : 'text-gray-900 dark:text-white',
                )}
              >
                {plan.title}
              </h3>
              {plan.headline && (
                <p
                  className={clsx(
                    'mt-2 text-sm font-medium uppercase tracking-wide',
                    plan.primary ? 'text-indigo-100' : 'text-indigo-500 dark:text-indigo-300',
                  )}
                >
                  {plan.headline}
                </p>
              )}
              {(() => {
                const pricing = formatPrice(plan.monthlyPrice, billingCycle);
                return (
                  <>
                    <p
                      className={clsx(
                        'mt-4 text-4xl font-bold',
                        plan.primary ? 'text-white' : 'text-gray-900 dark:text-white',
                      )}
                    >
                      {pricing.label}
                    </p>
                    <p
                      className={clsx(
                        'mt-1 text-xs',
                        plan.primary ? 'text-indigo-100/90' : 'text-gray-500 dark:text-gray-300',
                      )}
                    >
                      {pricing.sub}
                    </p>
                  </>
                );
              })()}
              <p
                className={clsx(
                  'mt-2 text-sm',
                  plan.primary ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-300',
                )}
              >
                {plan.description}
              </p>

              <Link
                href={plan.href}
                className={clsx(
                  'mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                  plan.primary ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-500',
                )}
              >
                {plan.cta}
              </Link>
              {plan.id !== 'free' && (
                <p
                  className={clsx(
                    'mt-3 text-xs font-medium',
                    plan.primary ? 'text-indigo-100/90' : 'text-indigo-500 dark:text-indigo-300',
                  )}
                >
                  PAYG default on — manage guard rails in Billing.
                </p>
              )}

              <div className="mt-8 space-y-2.5">
                {plan.features.map((feature, featureIndex) => {
                  const isChecked = featureSelections[plan.id]?.[featureIndex] ?? false;
                  return (
                    <button
                      key={feature.label}
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => toggleFeature(plan.id, featureIndex)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleFeature(plan.id, featureIndex);
                        }
                      }}
                      className={clsx(
                        'group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-transparent px-3 py-2 text-left text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                        plan.primary
                          ? 'hover:bg-white/10 focus-visible:ring-white/60 focus-visible:ring-offset-1'
                          : 'hover:bg-indigo-50/80 focus-visible:ring-indigo-200 focus-visible:ring-offset-2',
                      )}
                    >
                      <span
                        className={clsx(
                          'mt-[2px] flex h-6 w-6 items-center justify-center rounded-full transition-all duration-150',
                          isChecked
                            ? plan.primary
                              ? 'bg-white text-indigo-600 shadow-md'
                              : 'bg-indigo-100 text-indigo-600 shadow-sm'
                            : 'bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-white/30',
                        )}
                      >
                        {isChecked ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                          </svg>
                        )}
                      </span>
                      <span
                        className={clsx(
                          'transition-colors duration-150',
                          isChecked
                            ? plan.primary
                              ? 'text-indigo-50'
                              : 'text-gray-700 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-500',
                        )}
                      >
                        {feature.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto pt-8 text-xs text-gray-400 dark:text-gray-500">
                Charged via {provider.charAt(0).toUpperCase() + provider.slice(1)} · PAYG available
              </div>
            </div>
          </MotionDiv>
        ))}
      </div>
    </div>
  );
}
