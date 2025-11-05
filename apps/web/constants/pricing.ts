export type PricingFeature = {
  label: string;
  included: boolean;
};

export type PricingPlan = {
  id: string;
  title: string;
  monthlyPrice: number;
  description: string;
  headline?: string;
  cta: string;
  href: string;
  primary: boolean;
  features: PricingFeature[];
};

export type PaymentProvider = {
  id: string;
  name: string;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    title: 'Free',
    monthlyPrice: 0,
    headline: 'Auto-fix 3 daily · 20% usage buffer',
    description: '1 BC auto-fix per day, PAYG optional after card on file.',
    cta: 'Start For Free',
    href: '/signup?plan=free',
    primary: false,
    features: [
      { label: 'Daily auto-fix allowance (3 actions)', included: true },
      { label: '20% usage grace on PAYG metrics', included: true },
      { label: 'BC & RC purchase add-ons', included: false },
      { label: 'BudgetGuard alerts', included: true },
      { label: 'Email + in-product notifications', included: true },
    ],
  },
  {
    id: 'pro',
    title: 'Pro Plan',
    monthlyPrice: 19.9,
    headline: '400 BC · 6,000 RC · 1 Day Trial',
    description: 'PAYG billing enabled, monthly rollover, support for hybrid workflows.',
    cta: 'Start 1 Day Trial',
    href: '/signup?plan=pro',
    primary: true,
    features: [
      { label: '400 BC monthly allowance', included: true },
      { label: '6,000 RC monthly allowance', included: true },
      { label: '20% usage grace (metered)', included: true },
      { label: 'PAYG auto-top-up with guard rails', included: true },
      { label: 'Monthly rollover (1 cycle)', included: true },
      { label: 'BudgetGuard automation', included: true },
      { label: 'Priority chat + email support', included: true },
    ],
  },
  {
    id: 'scale',
    title: 'Scale Plan',
    monthlyPrice: 99.9,
    headline: '1,000 BC · 12,000 RC · 1 Day Trial',
    description: 'Hybrid shared pools with team governance, PAYG enabled by default.',
    cta: 'Upgrade To Scale',
    href: '/signup?plan=scale',
    primary: false,
    features: [
      { label: '1,000 BC monthly pool', included: true },
      { label: '12,000 RC monthly pool', included: true },
      { label: 'Shared + dedicated hybrid routing', included: true },
      { label: 'BudgetGuard thresholds with actions', included: true },
      { label: 'Real-time usage dashboards', included: true },
      { label: 'L2 support with 2h SLA', included: true },
    ],
  },
  {
    id: 'enterprise',
    title: 'Enterprise',
    monthlyPrice: 199.9,
    headline: 'Tailored BC/RC mix · Dedicated CSM',
    description: 'Annual rollovers, bespoke compliance reviews, on-call success engineering.',
    cta: 'Contact Sales',
    href: '/contact?topic=enterprise',
    primary: false,
    features: [
      { label: 'Custom BC/RC/Usage modeling', included: true },
      { label: 'Annual rollover controls', included: true },
      { label: 'SAML/SCIM & audit exports', included: true },
      { label: 'Dedicated workflow playbooks', included: true },
      { label: 'Priority integrations & onboarding', included: true },
      { label: 'Shared to dedicated migration support', included: true },
    ],
  },
];

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  { id: 'creem', name: 'Creem' },
  { id: 'stripe', name: 'Stripe' },
  { id: 'paypal', name: 'PayPal' },
];
