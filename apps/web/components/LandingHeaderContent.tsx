'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent, ChangeEvent } from 'react';

type LandingHeaderContentProps = {
  currentPath: string;
};

type NavLink = {
  label: string;
  href: string;
  external?: boolean;
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
  maxWidth: '1126px',
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
  paddingLeft: '18px',
  paddingRight: '18px',
  paddingTop: '0px',
  paddingBottom: '0px',
  height: '90px',
} as const;

const landingHeaderStyle = landingHeaderContainerStyle as unknown as CSSProperties;

const navLinks: NavLink[] = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'AppTemplates', href: '/AppTemplates' },
  { label: 'Docs', href: 'https://create.xyz/docs', external: true },
  { label: 'Blog', href: '/blog' },
  { label: 'Login', href: '/login' },
];

const languageOptions = [
  { value: 'en', label: 'English (US)' },
  { value: 'zh', label: '简体中文' },
  { value: 'ja', label: '日本語' },
] as const;


function isActiveLink(href: string, currentPath: string, external?: boolean) {
  if (external) return false;
  if (!href) return false;
  if (href === '/') return currentPath === '/';
  return currentPath === href;
}

export function LandingHeaderContent({ currentPath }: LandingHeaderContentProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<(typeof languageOptions)[number]['value']>('en');

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setActiveLanguage(event.target.value as (typeof languageOptions)[number]['value']);
  };

  const handleNavClick = (event: ReactMouseEvent<HTMLAnchorElement>, link: NavLink) => {
    if (link.triggerLogin) {
      event.preventDefault();
      openLogin();
    }

    setIsMenuOpen(false);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-[50] flex flex-row items-center justify-center px-[20px] pt-[20px] sm:px-[30px] sm:pt-[30px] tablet:px-[40px] tablet:pt-[40px]">
      <div
        className="flex h-[90px] w-full max-w-[1126px] flex-row items-center justify-between gap-[12px] rounded-full border border-comeback-gray-25/20 px-[18px] backdrop-blur-lg [font-family:var(--font-instrument-serif)] [font-style:normal] tablet:gap-[16px] transition-colors duration-1000 bg-comeback-gray-50/40"
        style={landingHeaderStyle}
      >
        <Link href="/" aria-label="Anything homepage">
          <Image
            alt="Anything Logo"
            src="/vibe_logo.png"
            width={100}
            height={120}
            className="ml-[10px] h-[120px] w-[100px] tablet:ml-[12px] tablet:h-[120px] tablet:w-[100px]"
            style={{ color: 'transparent', WebkitTouchCallout: 'none' }}
            priority
          />
        </Link>

        <div className="hidden w-fit items-center justify-center gap-[12px] [font-family:var(--font-instrument-sans)] tablet:flex tablet:gap-[16px] desktop:gap-[24px]">
          {navLinks.map((link) => {
            const commonClasses =
              'tracking-normal font-semibold [font-family:var(--font-instrument-sans)] text-[20px] text-white';

            if (link.external) {
              return (
                <a
                  key={link.label}
                  className={`${commonClasses} whitespace-nowrap`}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
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
                className={`${commonClasses} whitespace-nowrap`}
                aria-current={isActiveLink(link.href, currentPath) ? 'page' : undefined}
                onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => handleNavClick(event, link)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-white tablet:flex">
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 24 24"
            className="text-xl"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 0 1 5.08 16zm2.95-8H5.08a7.987 7.987 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" />
          </svg>
          <select
            aria-label="Select language"
            value={activeLanguage}
            onChange={handleLanguageChange}
            className="appearance-none bg-transparent text-sm font-medium text-white focus:outline-none"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value} className="text-gray-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Link
          href="/signup"
          className="hidden cursor-pointer flex-row items-center justify-center gap-[4px] rounded-full border border-transparent bg-comeback-gray-900 px-[10px] py-[6px] text-[13px] font-semibold leading-[120%] tracking-normal text-white transition-colors hover:bg-comeback-gray-700 active:bg-comeback-gray-600 [font-family:var(--font-instrument-sans)] [&>span]:[font-family:var(--font-instrument-sans)!important] tablet:flex tablet:px-[12px] tablet:py-[8px] tablet:text-[14px] desktop:px-[16px] desktop:py-[10px] desktop:text-[16px]"
          onClick={() => setIsMenuOpen(false)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get started
        </Link>

        <button
          type="button"
          className="tablet:hidden"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-top-menu"
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
          id="mobile-top-menu"
          className="fixed inset-x-0 top-[72px] z-[40] mx-auto mt-3 w-11/12 max-w-sm rounded-3xl border border-white/20 bg-comeback-gray-900/95 p-6 text-white shadow-2xl tablet:hidden"
        >
          <nav className="flex flex-col gap-4 text-base [font-family:var(--font-instrument-sans)]">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap text-[20px] font-semibold"
                  onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => handleNavClick(event, link)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="whitespace-nowrap text-[20px] font-semibold"
                  aria-current={isActiveLink(link.href, currentPath) ? 'page' : undefined}
                  onClick={(event: ReactMouseEvent<HTMLAnchorElement>) => handleNavClick(event, link)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </Link>
              )
            ))}
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 24 24"
                className="text-xl text-white"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path fill="none" d="M0 0h24v24H0z" />
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 0 1 5.08 16zm2.95-8H5.08a7.987 7.987 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z" />
              </svg>
              <select
                aria-label="Select language"
                value={activeLanguage}
                onChange={handleLanguageChange}
                className="w-full appearance-none bg-transparent font-medium text-white focus:outline-none"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value} className="text-comeback-gray-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Link
              href="/signup"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-white px-4 py-2 font-medium text-comeback-gray-900"
              onClick={() => setIsMenuOpen(false)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
