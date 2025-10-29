export type NavMenuVariant = 'light' | 'dark';

export type NavMenuItem = {
  href: string;
  label: string;
  extraClasses?: string[];
};

export const SHOPANY_LOGO_PATH = '/VibeAny_logo.png';

export const NAV_CONTAINER_CLASS = [
  'landing-header__nav',
  'nav_menu',
  'w-nav-menu',
  'flex',
  'flex-wrap',
  'items-center',
  'gap-10',
  'text-2xl',
  'font-semibold',
  'leading-tight',
].join(' ');

export const NAV_WRAPPER_CLASS = [
  'landing-header__nav-inner',
  'nav_menu_wrapper',
  'flex',
  'flex-wrap',
  'items-center',
  'gap-6',
].join(' ');

const baseLinkClasses = [
  'navbar-link',
  'w-nav-link',
  'relative',
  'text-2xl',
  'font-semibold',
  'px-6',
  'py-3',
  'rounded-full',
  'transition-colors',
  'duration-200',
  'focus-visible:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-offset-2',
];

const variantTextClasses: Record<NavMenuVariant, string[]> = {
  light: [
    'text-black',
    'hover:text-black',
    'hover:bg-[#002FA71A]',
    'focus-visible:ring-[#002FA7]',
    'focus-visible:ring-offset-white',
  ],
  dark: [
    'text-black',
    'hover:text-black',
    'hover:bg-[#002FA71A]',
    'focus-visible:ring-[#002FA7]',
    'focus-visible:ring-offset-white',
  ],
};

export const NAV_MENU_ITEMS: NavMenuItem[] = [
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#faqs', label: 'FAQs' },
  { href: '/#testimonials', label: 'Testimonials' },
  { href: '/blog', label: 'Blog' },
  { href: '#', label: 'Github', extraClasses: ['tablet-and-down'] },
];

export const NAV_MENU_CTA = {
  href: '#',
  dataWId: 'e52e2c89-fda7-5de7-a2b1-c865ddfa429a',
  className: [
    'button3',
    'buttonnew',
    'tablet-and-down-button',
    'w-inline-block',
    'inline-flex',
    'items-center',
    'justify-center',
    'px-5',
    'py-2',
    'rounded-lg',
    'bg-gradient-to-r',
    'from-cyan-500',
    'to-violet-500',
    'text-white',
    'font-semibold',
    'transition-colors',
    'duration-200',
    'hover:from-cyan-400',
    'hover:to-violet-400',
  ].join(' '),
  label: 'Launch My Store',
};

export function buildNavLinkClass(variant: NavMenuVariant): string {
  return [
    ...baseLinkClasses,
    ...variantTextClasses[variant],
  ].join(' ');
}

export const DEFAULT_NAV_VARIANT: NavMenuVariant = 'dark';

export function buildNavLinkClassWithExtra(item: NavMenuItem, variant: NavMenuVariant): string {
  const extra = item.extraClasses ?? [];
  return [buildNavLinkClass(variant), ...extra].join(' ');
}

const navLinksHtml = NAV_MENU_ITEMS.map(
  (item) => `          <a href="${item.href}" class="${buildNavLinkClassWithExtra(item, DEFAULT_NAV_VARIANT)}">${item.label}</a>`
).join('\n');

export const NAV_MENU_HTML = `
      <nav role="navigation" class="${NAV_CONTAINER_CLASS}">
        <div class="${NAV_WRAPPER_CLASS}">
${navLinksHtml}
        </div>
      </nav>
    `.trim();
