'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type LandingHeaderContentProps = {
  currentPath: string;
};

type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  triggerLogin?: boolean;
};

const landingHeaderContainerStyle = {
  WebkitTextSizeAdjust: '100%',
  tabSize: 4,
  fontFeatureSettings: 'normal',
  fontVariationSettings: 'normal',
  WebkitTapHighlightColor: 'transparent',
  '--tablet-screen-min': '640px',
  '--desktop-screen-min': '1232px',
  '--keyboard-offset': '0px',
  '--fa-style-family-brands': '"Font Awesome 6 Brands"',
  '--fa-font-brands': 'normal 400 1em/1 "Font Awesome 6 Brands"',
  '--fa-style-family-duotone': '"Font Awesome 6 Duotone"',
  '--fa-font-duotone': 'normal 900 1em/1 "Font Awesome 6 Duotone"',
  '--fa-font-light': 'normal 300 1em/1 "Font Awesome 6 Pro"',
  '--fa-font-regular': 'normal 400 1em/1 "Font Awesome 6 Pro"',
  '--fa-font-solid': 'normal 900 1em/1 "Font Awesome 6 Pro"',
  '--fa-style-family-classic': '"Font Awesome 6 Pro"',
  '--fa-font-thin': 'normal 100 1em/1 "Font Awesome 6 Pro"',
  '--fa-font-sharp-solid': 'normal 900 1em/1 "Font Awesome 6 Sharp"',
  '--fa-style-family-sharp': '"Font Awesome 6 Sharp"',
  '--fa-font-sharp-regular': 'normal 400 1em/1 "Font Awesome 6 Sharp"',
  lineHeight: 'inherit',
  '--font-instrument-serif': '"__Instrument_Serif_315a98","__Instrument_Serif_Fallback_315a98"',
  '--font-instrument-sans': '"__Instrument_Sans_e986a4","__Instrument_Sans_Fallback_e986a4"',
  '--tw-border-spacing-x': '0',
  '--tw-border-spacing-y': '0',
  '--tw-translate-x': '0',
  '--tw-translate-y': '0',
  '--tw-rotate': '0',
  '--tw-skew-x': '0',
  '--tw-skew-y': '0',
  '--tw-scale-x': '1',
  '--tw-scale-y': '1',
  '--tw-pan-x': 'initial',
  '--tw-pan-y': 'initial',
  '--tw-pinch-zoom': 'initial',
  '--tw-scroll-snap-strictness': 'proximity',
  '--tw-gradient-from-position': 'initial',
  '--tw-gradient-via-position': 'initial',
  '--tw-gradient-to-position': 'initial',
  '--tw-ordinal': 'initial',
  '--tw-slashed-zero': 'initial',
  '--tw-numeric-figure': 'initial',
  '--tw-numeric-spacing': 'initial',
  '--tw-numeric-fraction': 'initial',
  '--tw-ring-inset': 'initial',
  '--tw-ring-offset-width': '0px',
  '--tw-ring-offset-color': '#fff',
  '--tw-ring-color': 'rgba(117,170,211,.5)',
  '--tw-ring-offset-shadow': '0 0 #0000',
  '--tw-ring-shadow': '0 0 #0000',
  '--tw-shadow': '0 0 #0000',
  '--tw-shadow-colored': '0 0 #0000',
  '--tw-blur': 'initial',
  '--tw-brightness': 'initial',
  '--tw-contrast': 'initial',
  '--tw-grayscale': 'initial',
  '--tw-hue-rotate': 'initial',
  '--tw-invert': 'initial',
  '--tw-saturate': 'initial',
  '--tw-sepia': 'initial',
  '--tw-drop-shadow': 'initial',
  '--tw-backdrop-brightness': 'initial',
  '--tw-backdrop-contrast': 'initial',
  '--tw-backdrop-grayscale': 'initial',
  '--tw-backdrop-hue-rotate': 'initial',
  '--tw-backdrop-invert': 'initial',
  '--tw-backdrop-opacity': 'initial',
  '--tw-backdrop-saturate': 'initial',
  '--tw-backdrop-sepia': 'initial',
  '--tw-contain-size': 'initial',
  '--tw-contain-layout': 'initial',
  '--tw-contain-paint': 'initial',
  '--tw-contain-style': 'initial',
  boxSizing: 'border-box',
  border: '0 solid #bbb',
  scrollbarColor: 'auto',
  scrollbarWidth: 'auto',
  display: 'flex',
  width: '100%',
  maxWidth: '826px',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderRadius: '9999px',
  borderWidth: '1px',
  borderColor: 'hsla(0,0%,98%,.2)',
  backgroundColor: 'hsla(0,0%,95%,.4)',
  '--tw-backdrop-blur': 'blur(16px)',
  backdropFilter:
    'var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)',
  transitionProperty:
    'color,background-color,border-color,text-decoration-color,fill,stroke',
  transitionTimingFunction: 'cubic-bezier(0,0,.2,1)',
  transitionDuration: '1s',
  animationDuration: '1s',
  fontFamily: 'var(--font-instrument-serif)',
  fontStyle: 'normal',
  gap: '16px',
  paddingLeft: '14px',
  paddingRight: '14px',
  paddingTop: '12px',
  paddingBottom: '12px',
} as const;

const landingHeaderStyle = landingHeaderContainerStyle as unknown as CSSProperties;

const navLinks: NavLink[] = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: 'https://create.xyz/docs', external: true },
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
  { label: 'Login', href: '/login', triggerLogin: true },
];

function isActiveLink(href: string, currentPath: string, external?: boolean) {
  if (external) return false;
  if (!href) return false;
  if (href === '/') return currentPath === '/';
  return currentPath === href;
}

export function LandingHeaderContent({ currentPath }: LandingHeaderContentProps) {
  const { openLogin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavClick = (event: ReactMouseEvent<HTMLAnchorElement>, link: NavLink) => {
    if (link.triggerLogin) {
      event.preventDefault();
      openLogin();
    }

    setIsMenuOpen(false);
  };

  return (
    <header className="style_animate-slideDown__alSfM fixed right-0 left-0 top-[-150px] z-[50] flex flex-row items-center justify-center px-[20px] pt-[20px] sm:px-[30px] sm:pt-[30px] tablet:px-[40px] tablet:pt-[40px]">
      <div
        className="flex w-full max-w-[826px] flex-row items-center justify-between gap-[12px] rounded-full border border-comeback-gray-25/20 px-[12px] py-[10px] backdrop-blur-lg [font-family:var(--font-instrument-serif)] [font-style:normal] tablet:gap-[16px] tablet:px-[14px] tablet:py-[12px] transition-colors duration-1000 bg-comeback-gray-50/40"
        style={landingHeaderStyle}
      >
        <Link href="/" aria-label="Anything homepage">
          <Image
            alt="Anything Logo"
            src="/images/homepage-v2/Anything_Logo_White.svg"
            width={74}
            height={26}
            className="ml-[10px] h-auto max-h-[18px] w-auto max-w-[56px] tablet:ml-[12px] tablet:max-h-[24px] tablet:max-w-[68px] desktop:max-h-[26px] desktop:max-w-[74px]"
            style={{ color: 'transparent', WebkitTouchCallout: 'none' }}
            priority
          />
        </Link>

        <div className="hidden w-fit items-center justify-center gap-[12px] [font-family:var(--font-instrument-sans)] tablet:flex tablet:gap-[16px] desktop:gap-[24px]">
          {navLinks.map((link) => {
            const commonClasses =
              'tracking-normal font-semibold [font-family:var(--font-instrument-sans)] desktop:text-[18px] tablet:text-[16px] text-[15px] text-white';

            if (link.external) {
              return (
                <a
                  key={link.label}
                  className={`${commonClasses} whitespace-nowrap`}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => handleNavClick(event, link)}
                >
                  {link.label}
                </a>
              );
            }

            return (
              <Link
                key={link.label}
                href={link.href}
                className={commonClasses}
                aria-current={isActiveLink(link.href, currentPath) ? 'page' : undefined}
                onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => handleNavClick(event, link)}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <Link
          href="/signup"
          className="flex-row items-center justify-center gap-[4px] outline-none transition-colors border-[1px] hover:bg-comeback-gray-700 active:bg-comeback-gray-600 border-transparent text-white p-[12px] hidden whitespace-nowrap rounded-full bg-comeback-gray-900 px-[10px] py-[6px] text-[13px] leading-[120%] tracking-normal [font-family:var(--font-instrument-sans)] [&>span]:[font-family:var(--font-instrument-sans)!important] tablet:block tablet:px-[12px] tablet:py-[8px] tablet:text-[14px] desktop:px-[16px] desktop:py-[10px] desktop:text-[16px] cursor-pointer"
          onClick={() => setIsMenuOpen(false)}
        >
          Get started
        </Link>

        <button
          type="button"
          className="tablet:hidden"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={isMenuOpen}
          aria-controls="landing-header-mobile-menu"
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="styles_trigger__DqyHs mr-[10px] text-white"
          >
            <path d="M3 12h18M3 6h18M3 18h18"></path>
          </svg>
          <span className="sr-only">Toggle navigation menu</span>
        </button>
      </div>

      {isMenuOpen ? (
        <div
          id="landing-header-mobile-menu"
          className="fixed inset-x-0 top-[72px] z-[40] mx-auto mt-3 w-11/12 max-w-sm rounded-3xl border border-white/20 bg-comeback-gray-900/95 p-6 text-white shadow-2xl tablet:hidden"
        >
          <nav className="flex flex-col gap-4 text-base [font-family:var(--font-instrument-sans)]">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="whitespace-nowrap text-lg font-semibold"
                  onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => handleNavClick(event, link)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="whitespace-nowrap text-lg font-semibold"
                  aria-current={isActiveLink(link.href, currentPath) ? 'page' : undefined}
                  onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => handleNavClick(event, link)}
                >
                  {link.label}
                </Link>
              )
            ))}
            <Link
              href="/signup"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-white px-4 py-2 font-medium text-comeback-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              Get started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
