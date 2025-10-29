"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  SVGProps,
  useCallback,
  useState,
  type CSSProperties,
} from "react";
import { Check, Globe, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const PROMPT_SUGGESTIONS = [
  { emoji: "📊", label: "Reporting Dashboard" },
  { emoji: "🎮", label: "Gaming Platform" },
  { emoji: "👋", label: "Onboarding Portal" },
  { emoji: "🏠", label: "Room Visualizer" },
  { emoji: "🔗", label: "Networking App" },
];

const FEATURE_SECTIONS = [
  {
    title: "Create at the speed of thought",
    description:
      "Tell VibeAny your idea, and watch it transform into a working app complete with all the necessary components, pages, flows and features.",
    cta: "Start building",
    mediaClassName: "feature-card-1",
    media: (
      <div className="bg-white/80 rounded-2xl p-6 shadow-lg max-w-sm">
        <div className="text-sm text-gray-600 mb-4">SubTracker</div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Active Subscriptions</span>
            <span className="text-2xl font-light">10</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Spent This Month</span>
            <span className="text-2xl font-light">$110.36</span>
          </div>
          <div className="text-xs text-gray-500 mt-6">Recent Activity</div>
        </div>
      </div>
    ),
  },
  {
    title: "The backend's built-in automatically",
    description:
      "Everything your idea needs to function, like letting users sign in, saving their data, or creating role-based permissions is taken care of behind the scenes.",
    cta: "Start building",
    mediaClassName: "feature-card-2",
    media: (
      <div className="bg-white/80 rounded-2xl p-6 shadow-lg max-w-sm">
        <div className="text-sm text-gray-700 font-medium mb-4">
          Building your Subscription Tracker app
        </div>
        <div className="space-y-2">
          {[
            "Setting up user authentication",
            "Building subscription database",
            "Configuring email notifications",
            "Deploying with notifications",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs">
              <Check className="w-4 h-4 text-green-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Ready to use, instantly.",
    description:
      "Our platform comes with built-in hosting, so when your app is ready the only thing left to do is publish, put it to use, and share it with your friends or community.",
    cta: "Start building",
    mediaClassName: "feature-card-3",
    media: (
      <div className="bg-white/80 rounded-2xl p-6 shadow-lg max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-700 font-medium">SubTracker</div>
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
          </div>
        </div>
        <div className="text-xs text-gray-600 mb-3">My Subscriptions</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xl mb-1">$110.36</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xl mb-1">$124.37</div>
            <div className="text-xs text-gray-500">Last</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-xl mb-1">10</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
        </div>
      </div>
    ),
  },
];

const TESTIMONIALS = [
  {
    text: "Okay, VibeAny has blown my mind. No iterations, no changes,...",
    author: "Maria Martin",
    handle: "@marias_martin",
    icon: "X",
  },
  {
    text: "Just built this awesome web app using @vibe_any! I'm blown awa...",
    author: "Gleb Konon",
    handle: "",
    icon: "in",
  },
  {
    text: "VibeAny revolutionizes app development by enabling users t...",
    author: "Eran Cohen",
    handle: "",
    icon: "P",
  },
  {
    text: "Amazing understanding of the user needs and thorough handli...",
    author: "Ariel MI",
    handle: "",
    icon: "P",
  },
  {
    text: "@MS_VIBEANY @vibe_any I gave it a try and I must to be truthful, it...",
    author: "Thatweb3guy",
    handle: "@myfootyfantasy",
    icon: "X",
  },
  {
    text: "What makes VibeAny different is that the interaction with the AI is...",
    author: "Richard Manisa",
    handle: "",
    icon: "P",
  },
];

const FAQ_ITEMS = [
  {
    question: "What is VibeAny?",
    answer:
      "VibeAny is an AI-powered platform that lets you turn any idea into a fully-functional custom app, without the need for any coding experience.",
  },
  {
    question: "Do I need coding experience to use VibeAny?",
    answer:
      "No. Our platform is designed to be easily accessible to non-technical users. Just describe your app idea in plain language.",
  },
  {
    question: "What types of applications can I build with VibeAny?",
    answer:
      "You can build a wide variety of applications including dashboards, tracking tools, portals, and more.",
  },
  {
    question: "What kind of integrations does VibeAny support?",
    answer: "VibeAny supports various integrations to extend your app's functionality.",
  },
  {
    question: "How are VibeAny applications deployed?",
    answer:
      "Applications are automatically hosted on our platform and can be published instantly.",
  },
  {
    question: "How does the natural language development process work?",
    answer:
      "Simply describe what you want to build, and our AI will generate the complete application for you.",
  },
  {
    question: "Is my data secure with VibeAny?",
    answer:
      "Yes, we take data security seriously and implement industry-standard security measures.",
  },
  {
    question: "Do I own the applications I create with VibeAny?",
    answer: "Yes, you retain full ownership of the applications you create.",
  },
];

const headerShellStyle = {
  WebkitTextSizeAdjust: "100%",
  tabSize: 4,
  fontFamily:
    "Inter,ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji",
  fontFeatureSettings: "normal",
  fontVariationSettings: "normal",
  WebkitTapHighlightColor: "transparent",
  boxSizing: "border-box",
  border: "0 solid #bbb",
  scrollbarColor: "auto",
  scrollbarWidth: "auto",
  position: "fixed",
  left: 0,
  right: 0,
  top: 0,
  zIndex: 50,
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingLeft: "40px",
  paddingRight: "40px",
  paddingTop: "40px",
} as CSSProperties;

const headerMenuStyle = {
  WebkitTextSizeAdjust: "100%",
  tabSize: 4,
  fontFeatureSettings: "normal",
  fontVariationSettings: "normal",
  WebkitTapHighlightColor: "transparent",
  "--tablet-screen-min": "640px",
  "--desktop-screen-min": "1232px",
  "--keyboard-offset": "0px",
  "--fa-style-family-brands": '"Font Awesome 6 Brands"',
  "--fa-font-brands": 'normal 400 1em/1 "Font Awesome 6 Brands"',
  "--fa-style-family-duotone": '"Font Awesome 6 Duotone"',
  "--fa-font-duotone": 'normal 900 1em/1 "Font Awesome 6 Duotone"',
  "--fa-font-light": 'normal 300 1em/1 "Font Awesome 6 Pro"',
  "--fa-font-regular": 'normal 400 1em/1 "Font Awesome 6 Pro"',
  "--fa-font-solid": 'normal 900 1em/1 "Font Awesome 6 Pro"',
  "--fa-style-family-classic": '"Font Awesome 6 Pro"',
  "--fa-font-thin": 'normal 100 1em/1 "Font Awesome 6 Pro"',
  "--fa-font-sharp-solid": 'normal 900 1em/1 "Font Awesome 6 Sharp"',
  "--fa-style-family-sharp": '"Font Awesome 6 Sharp"',
  "--fa-font-sharp-regular": 'normal 400 1em/1 "Font Awesome 6 Sharp"',
  lineHeight: "inherit",
  "--font-instrument-serif":
    '"__Instrument_Serif_315a98","__Instrument_Serif_Fallback_315a98"',
  "--font-instrument-sans":
    '"__Instrument_Sans_e986a4","__Instrument_Sans_Fallback_e986a4"',
  "--tw-border-spacing-x": "0",
  "--tw-border-spacing-y": "0",
  "--tw-translate-x": "0",
  "--tw-translate-y": "0",
  "--tw-rotate": "0",
  "--tw-skew-x": "0",
  "--tw-skew-y": "0",
  "--tw-scale-x": "1",
  "--tw-scale-y": "1",
  "--tw-ring-offset-width": "0px",
  "--tw-ring-offset-color": "#fff",
  "--tw-ring-color": "rgba(117,170,211,.5)",
  "--tw-ring-offset-shadow": "0 0 #0000",
  "--tw-ring-shadow": "0 0 #0000",
  "--tw-shadow": "0 0 #0000",
  display: "flex",
  width: "100%",
  maxWidth: "826px",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  borderRadius: "9999px",
  borderWidth: "1px",
  borderColor: "hsla(0,0%,98%,.2)",
  backgroundColor: "hsla(0,0%,95%,.4)",
  backdropFilter:
    "blur(16px) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)",
  transitionProperty:
    "color,background-color,border-color,text-decoration-color,fill,stroke",
  transitionTimingFunction: "cubic-bezier(0,0,.2,1)",
  transitionDuration: "1s",
  animationDuration: "1s",
  fontFamily: "var(--font-instrument-serif)",
  fontStyle: "normal",
  gap: "16px",
  paddingLeft: "18px",
  paddingRight: "18px",
  height: "80px",
  paddingTop: "0px",
  paddingBottom: "0px",
} as CSSProperties;

const promptBoxStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "48px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.86) 100%)",
  boxShadow: "0 36px 90px rgba(5, 30, 110, 0.28)",
  padding: "40px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
};

function StartArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 19V7"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 11l5-5 5 5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MarketingLandingPage() {
  const [promptValue, setPromptValue] = useState(
    "Generate a workout planner for beginners",
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigateToVibeAny = useCallback(
    (value?: string) => {
      const targetValue = (value ?? promptValue).trim();

      if (typeof window !== "undefined") {
        try {
          if (targetValue) {
            window.sessionStorage.setItem("vibeany:landingPrompt", targetValue);
            window.sessionStorage.setItem("vibeany:autoSubmit", "true");
          } else {
            window.sessionStorage.removeItem("vibeany:landingPrompt");
            window.sessionStorage.removeItem("vibeany:autoSubmit");
          }
        } catch (error) {
          console.warn(
            "Failed to persist landing prompt for VibeAny navigation",
            error,
          );
        }

        window.location.href = "/vibeany";
      }
    },
    [promptValue],
  );

  const handlePromptSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      navigateToVibeAny();
    },
    [navigateToVibeAny],
  );

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-900">
      <header
        className="fixed right-0 left-0 z-[50] flex flex-row items-center justify-center px-[20px] pt-[20px] sm:px-[30px] sm:pt-[30px] tablet:px-[40px] tablet:pt-[40px]"
        style={headerShellStyle}
      >
        <div
          className="flex h-[80px] w-full max-w-[826px] flex-row items-center justify-between gap-[12px] rounded-full border border-comeback-gray-25/20 px-[18px] backdrop-blur-lg [font-family:var(--font-instrument-serif)] [font-style:normal] tablet:gap-[16px] transition-colors duration-1000 bg-comeback-gray-50/40"
          style={headerMenuStyle}
        >
          <Link href="/" aria-label="Anything homepage">
            <Image
              alt="Anything Logo"
              src="/vibe_logo.png"
              width={300}
              height={150}
              className="ml-[10px] h-[100px] w-auto tablet:ml-[12px]"
              style={{ color: "transparent", WebkitTouchCallout: "none" }}
              priority
            />
          </Link>

          <div className="hidden w-fit items-center justify-center gap-[12px] [font-family:var(--font-instrument-sans)] tablet:flex tablet:gap-[16px] desktop:gap-[24px]">
            <Link
              className="tracking-normal font-semibold [font-family:var(--font-instrument-sans)] desktop:text-[18px] tablet:text-[16px] text-[15px] text-white"
              href="/pricing"
            >
              Pricing
            </Link>
            <Link
              className="tracking-normal font-semibold [font-family:var(--font-instrument-sans)] desktop:text-[18px] tablet:text-[16px] text-[15px] text-white"
              href="/AppTemplates"
            >
              AppTemplates
            </Link>
            <a
              target="_blank"
              className="tracking-normal font-semibold [font-family:var(--font-instrument-sans)] desktop:text-[18px] tablet:text-[16px] text-[15px] text-white whitespace-nowrap"
              href="https://create.xyz/docs"
              rel="noreferrer"
            >
              Docs
            </a>
            <Link
              className="tracking-normal font-semibold [font-family:var(--font-instrument-sans)] desktop:text-[18px] tablet:text-[16px] text-[15px] text-white"
              href="/blog"
            >
              Blog
            </Link>
            <Link
              className="tracking-normal font-semibold [font-family:var(--font-instrument-sans)] desktop:text-[18px] tablet:text-[16px] text-[15px] text-white"
              href="/login"
            >
              Login
            </Link>
          </div>

          <Link
            className="flex-row items-center justify-center gap-[4px] font-semibold outline-none transition-colors border-[1px] hover:bg-comeback-gray-700 active:bg-comeback-gray-600 border-transparent text-white p-[12px] hidden whitespace-nowrap rounded-full bg-comeback-gray-900 px-[10px] py-[6px] text-[13px] leading-[120%] tracking-normal [font-family:var(--font-instrument-sans)] [&>span]:[font-family:var(--font-instrument-sans)!important] tablet:block tablet:px-[12px] tablet:py-[8px] tablet:text-[14px] desktop:px-[16px] desktop:py-[10px] desktop:text-[16px] cursor-pointer"
            href="/signup"
          >
            Get started
          </Link>

          <div className="tablet:hidden">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-haspopup="dialog"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-top-menu"
            >
              <Menu className="styles_trigger__DqyHs mr-[10px] text-white" />
            </button>
          </div>
        </div>
      </header>

      {isMenuOpen ? (
        <div
          id="mobile-top-menu"
          className="fixed inset-x-0 top-[72px] z-[60] mx-auto mt-3 w-11/12 max-w-sm rounded-3xl border border-white/20 bg-comeback-gray-900/95 p-6 text-white shadow-2xl tablet:hidden"
        >
          <nav className="flex flex-col gap-4 text-base [font-family:var(--font-instrument-sans)]">
            <Link
              className="whitespace-nowrap text-lg font-semibold"
              href="/pricing"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <a
              href="https://create.xyz/docs"
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap text-lg font-semibold"
              onClick={() => setIsMenuOpen(false)}
            >
              Docs
            </a>
            <Link
              className="whitespace-nowrap text-lg font-semibold"
              href="/blog"
              onClick={() => setIsMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              className="whitespace-nowrap text-lg font-semibold"
              href="/careers"
              onClick={() => setIsMenuOpen(false)}
            >
              Careers
            </Link>
            <Link
              className="whitespace-nowrap text-lg font-semibold"
              href="/login"
              onClick={() => setIsMenuOpen(false)}
            >
              Login
            </Link>
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

      <div className="relative flex min-h-screen flex-col">
        <main className="flex-1">
          <section className="relative pt-40 pb-24 px-4 sm:px-6 lg:px-8 text-center bg-[url('/BG%20-%20Tablet.jpg')] bg-cover bg-top">
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700">
                <Globe className="h-4 w-4" />
                Unlimited Storefront Automation
              </div>
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-[68px]">
                Build, Test, and Grow APP/Stores with AI — All in One App
              </h1>
              <p className="max-w-2xl text-lg text-slate-700">
                VibeAny lets you build fully-functional apps in minutes with just your words. No coding necessary.
              </p>

              <div className="flex w-full flex-col items-center">
                <form
                  onSubmit={handlePromptSubmit}
                  className="mx-auto w-full max-w-[1146px]"
                >
                  <div className="relative flex h-[213px] w-full items-center">
                    <div
                      id="comp-mcev08lb"
                      className="lk9PkF comp-mcev08lb wixui-text-box wixui-shadow shadow"
                      style={promptBoxStyle}
                    >
                      <label
                        htmlFor="textarea_comp-mcev08lb"
                        className="PSkPrR wixui-text-box__label"
                      ></label>
                      <textarea
                        id="textarea_comp-mcev08lb"
                        value={promptValue}
                        onChange={(event) => setPromptValue(event.target.value)}
                        className="rEindN has-custom-focus wixui-text-box__input h-full w-full resize-none bg-transparent pr-28 text-xl font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        rows={1}
                        placeholder="Make a note-taking app that syncs in real time|"
                        aria-required="false"
                        aria-invalid="false"
                      />
                    </div>
                    <button
                      type="submit"
                      className="group absolute bottom-10 right-10 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#ff8a3c] via-[#ff6f2a] to-[#ff3c20] text-white shadow-[0_22px_44px_rgba(255,112,52,0.35)] transition hover:-translate-y-1 hover:shadow-[0_26px_54px_rgba(255,112,52,0.45)]"
                      aria-label="Start generating"
                    >
                      <StartArrowIcon className="h-5 w-5" />
                      <span className="sr-only">Start Now</span>
                    </button>
                  </div>
                </form>
                <div className="mt-10 flex items-center gap-2 text-sm text-white/80">
                  <span>Not sure where to start? Try one of these:</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                  {PROMPT_SUGGESTIONS.map(({ emoji, label }) => (
                    <button
                      key={label}
                      type="button"
                      className="flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                      onClick={() => setPromptValue(`${emoji} ${label}`)}
                    >
                      <span>{emoji}</span>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-6 text-xs uppercase tracking-[0.35em] text-white/70">
                  Trusted by 400K+ users
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white/85 py-20 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
              <h2 className="text-4xl font-light text-slate-900">
                Consider yourself limitless.
              </h2>
              <p className="text-lg text-slate-600">
                If you can describe it, you can build it.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-6xl gap-10 md:grid-cols-2">
              {FEATURE_SECTIONS.map(
                ({ title, description, cta, media, mediaClassName }) => (
                  <div
                    key={title}
                    className="flex flex-col gap-8 rounded-[32px] bg-white/90 p-8 shadow-[0_40px_120px_rgba(15,23,42,0.08)] ring-1 ring-white/70 md:flex-row md:items-center"
                  >
                    <div className="flex-1 space-y-6">
                      <h3 className="text-3xl font-light text-slate-900">
                        {title}
                      </h3>
                      <p className="text-slate-600">{description}</p>
                      <Button className="rounded-full bg-slate-900 px-8 text-white hover:bg-slate-800">
                        {cta}
                      </Button>
                    </div>
                    <div
                      className={`${mediaClassName} flex flex-1 items-center justify-center rounded-[28px] p-8`}
                    >
                      {media}
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="testimonial-bg py-20 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-center text-3xl font-light text-slate-900">
                “Okay, @base_44 has blown my mind.”
              </h2>
              <p className="mt-4 text-center text-slate-600">
                And other great things our users say about us.
              </p>
              <div className="mt-12 grid gap-6 md:grid-cols-3">
                {TESTIMONIALS.map(({ text, author, handle, icon }) => (
                  <div
                    key={author}
                    className="rounded-3xl bg-white p-6 text-left shadow-lg ring-1 ring-white/70 transition hover:-translate-y-1"
                  >
                    <p className="text-sm text-slate-700">{text}</p>
                    <div className="mt-6 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium text-slate-900">
                          {author}
                        </div>
                        {handle ? (
                          <div className="text-xs text-slate-500">{handle}</div>
                        ) : null}
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
                        {icon}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-12 text-center">
                <Button className="rounded-full bg-slate-900 px-8 text-white hover:bg-slate-800">
                  Start building
                </Button>
              </div>
            </div>
          </section>

          <section className="pricing-bg py-20 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl text-center">
              <h2 className="text-4xl font-light text-white">
                Pricing plans for every need
              </h2>
              <div className="mt-16 grid gap-10 md:grid-cols-2">
                <div className="rounded-[36px] bg-white/95 p-10 text-left shadow-2xl ring-1 ring-white/60">
                  <h3 className="text-3xl font-light text-slate-900">
                    Start for free.
                  </h3>
                  <p className="mt-4 text-slate-700">Get access to:</p>
                  <div className="mt-6 space-y-4 text-slate-700">
                    {[
                      "All core features",
                      "Built-in integrations",
                      "Authentication system",
                      "Database functionality",
                    ].map((benefit) => (
                      <div key={benefit} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs text-white">
                          <Check className="h-4 w-4" />
                        </span>
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="mt-10 w-full rounded-full bg-slate-900 py-6 text-white hover:bg-slate-800">
                    Start building
                  </Button>
                </div>
                <div className="rounded-[36px] bg-white/95 p-10 text-left shadow-2xl ring-1 ring-white/60">
                  <h3 className="text-3xl font-light text-slate-900">
                    Paid plans from
                  </h3>
                  <div className="mt-6 text-5xl font-light text-slate-900">
                    $20<span className="text-xl text-slate-500">/mo</span>
                  </div>
                  <p className="mt-6 text-slate-700">
                    Upgrade as you go for more credits, more features, and more support.
                  </p>
                  <Button className="mt-10 w-full rounded-full bg-slate-900 py-6 text-white hover:bg-slate-800">
                    See all plans
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-4xl font-light text-slate-900">FAQs</h2>
              <Accordion
                type="single"
                collapsible
                className="mt-10 space-y-4 rounded-[32px]"
              >
                {FAQ_ITEMS.map(({ question, answer }) => (
                  <AccordionItem
                    key={question}
                    value={question}
                    className="overflow-hidden rounded-[24px] border border-slate-100 bg-white/90 px-4 shadow-sm"
                  >
                    <AccordionTrigger className="text-left text-lg font-medium text-slate-900 hover:no-underline">
                      {question}
                    </AccordionTrigger>
                    <AccordionContent className="text-base text-slate-600">
                      {answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        </main>

        <footer className="bg-gradient-to-b from-white/95 to-white/80 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 md:grid-cols-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Image
                    src="/vibe_Icon.png"
                    alt="VibeAny icon"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full"
                  />
                  <span className="text-xl font-semibold">VibeAny</span>
                </div>
                <p className="text-sm text-slate-600 leading-6">
                  VibeAny is the AI-powered platform that lets users build fully functioning apps in minutes. Using nothing but natural language, VibeAny enables anyone to turn their words into personal productivity apps, back-office tools, customer portals, or complete enterprise products that are ready to use, no integrations required.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                  Company
                </h4>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>
                    <Link href="#" className="hover:text-slate-900">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-slate-900">
                      Affiliate Program
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                  Product
                </h4>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {[
                    "Features",
                    "Integrations",
                    "Enterprise",
                    "Pricing",
                    "Roadmap",
                    "Changelog",
                    "Feature Request",
                  ].map((item) => (
                    <li key={item}>
                      <Link href="#" className="hover:text-slate-900">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                  Resources
                </h4>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {["Docs & FAQs", "Higher Ed", "Community", "Blog"].map(
                    (item) => (
                      <li key={item}>
                        <Link href="#" className="hover:text-slate-900">
                          {item}
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                  Legal
                </h4>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {[
                    "Privacy Policy",
                    "Terms of Service",
                    "Security",
                    "Report Misuse",
                    "Responsible Use Policy",
                  ].map((item) => (
                    <li key={item}>
                      <Link href="#" className="hover:text-slate-900">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-slate-200 pt-8 text-sm text-slate-500 md:flex-row">
              <div className="flex gap-4">
                {["X", "D", "in", "G"].map((icon) => (
                  <span
                    key={icon}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
                  >
                    {icon}
                  </span>
                ))}
              </div>
              <p>2025 VibeAny Inc. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
