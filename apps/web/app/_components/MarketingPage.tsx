import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Quote } from 'lucide-react';
import NavMenu from '@/components/NavMenu';
import { NAV_MENU_CTA } from '@/constants/navMenu';
import { PricingPlansGrid } from '@/components/PricingPlansGrid';
import { PRICING_PLANS } from '@/constants/pricing';

const features = [
  {
    title: 'AI Storefront Builder',
    description:
      'Generate fully responsive storefronts in minutes. Choose a model, describe your concept, and watch VibeAny produce a production-ready experience.',
  },
  {
    title: 'Integrated Workflows',
    description:
      'Preview, iterate, and publish without leaving the browser. Connect to GitHub, Vercel, and Supabase for seamless collaboration.',
  },
  {
    title: 'Analytics & Optimisation',
    description:
      'Track performance across every launch. Experiment with content, deploy A/B tests, and let AI suggest improvements automatically.',
  },
];

const faqs = [
  {
    question: 'VibeAny 适合谁？',
    answer: '我们为希望快速上线和迭代电商体验的独立开发者、品牌团队、以及服务机构打造。AI 会根据你的提示生成页面、配置服务，并帮助你完成发布。',
  },
  {
    question: '需要懂代码吗？',
    answer: '不需要。你可以完全依赖可视化操作完成构建。如果你想进一步自定义，也随时可以导出代码或接入 GitHub 工作流。',
  },
  {
    question: '可以和现有的技术栈集成吗？',
    answer: '可以。VibeAny 支持与 GitHub、Vercel、Supabase 等服务对接，同时也提供 API 方便与自有系统集成。',
  },
];

const testimonials = [
  {
    name: 'Aiko Nakamura',
    role: 'Growth Lead @ Nova Commerce',
    quote:
      '“我们用 VibeAny 在一周内上线了三个新品牌实验，转化率直接提升 38%。整个流程几乎不用写代码。”',
  },
  {
    name: 'Michael Chen',
    role: 'Founder @ HyperLabs',
    quote:
      '“AI 生成的初稿已经足够好，再配合我们的调优和自动化部署管线，比传统外包效率高太多了。”',
  },
];

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#05060d] text-white">
      <header className="relative z-10 hidden">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/VibeAny_logo.png" alt="VibeAny" width={160} height={40} priority />
            </Link>
            <div className="hidden lg:block">
              <NavMenu />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden gap-4 lg:flex">
              {PRICING_PLANS.slice(0, 2).map((plan) => (
                <div key={plan.id} className="text-xs text-white/60">
                  {plan.title}
                </div>
              ))}
            </div>
            <Link
              href={NAV_MENU_CTA.href}
              className={`${NAV_MENU_CTA.className} shadow-lg shadow-white/20 hover:shadow-white/40`}
            >
              {NAV_MENU_CTA.label}
            </Link>
          </div>
        </div>
        <div className="lg:hidden">
          <div className="mx-auto max-w-7xl px-6 pb-6">
            <NavMenu />
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(111,76,255,0.35),rgba(5,6,13,0.4)_55%,rgba(5,6,13,1)_90%)]" />
          <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 pb-24 pt-16 text-center lg:pb-32 lg:pt-28">
            <span className="rounded-full border border-white/20 px-4 py-1 text-sm text-white/80 backdrop-blur">
              更快上线 · 更聪明运营
            </span>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Build, Test, and Grow APP/Stores with AI — All in One App
            </h1>
            <p className="max-w-3xl text-lg text-white/70">
              从创意、生成、调试到部署，VibeAny 让电商团队把每一次灵感转化成可运营的商业体验。
              免费开始，随时升级到全功能方案。
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-base font-semibold text-black transition hover:bg-slate-100"
              >
                查看定价
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3 text-base font-semibold text-white transition hover:border-white/40"
              >
                了解功能
              </Link>
            </div>
            <div className="grid w-full gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur lg:grid-cols-3">
              <div className="flex flex-col items-start gap-2 text-left">
                <span className="text-3xl font-bold">10x</span>
                <span className="text-sm text-white/60">更快上线电商实验</span>
              </div>
              <div className="flex flex-col items-start gap-2 text-left">
                <span className="text-3xl font-bold">95%</span>
                <span className="text-sm text-white/60">用户在首周完成部署</span>
              </div>
              <div className="flex flex-col items-start gap-2 text-left">
                <span className="text-3xl font-bold">24/7</span>
                <span className="text-sm text-white/60">AI 助手持续迭代你的店铺</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="relative border-t border-white/10 bg-[#070817] py-24">
          <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold sm:text-4xl">打造高转化电商体验的完整工具链</h2>
              <p className="mt-4 text-white/70">
                VibeAny 将 AI 生产力与专业电商运营流程结合，帮助你从创意验证到规模化增长。
              </p>
            </div>
            <div className="grid gap-10 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="relative border-t border-white/10 bg-[#05060d] py-24">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold sm:text-4xl">灵活的方案，匹配你的增长节奏</h2>
              <p className="mt-4 text-white/70">
                从个人项目到企业级部署，选择合适的计划即可开始构建和扩展你的数字商业版图。
              </p>
            </div>
            <PricingPlansGrid />
          </div>
        </section>

        {/* FAQs */}
        <section id="faqs" className="relative border-t border-white/10 bg-[#070817] py-24">
          <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold sm:text-4xl">常见问题</h2>
              <p className="mt-4 text-white/70">
                如果没有找到答案，欢迎通过社区或支持渠道联系我们，我们会尽快回复。
              </p>
            </div>
            <div className="grid gap-6">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                  <h3 className="text-lg font-semibold">{faq.question}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="relative border-t border-white/10 bg-[#05060d] py-24">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold sm:text-4xl">真实团队的反馈</h2>
              <p className="mt-4 text-white/70">
                VibeAny 已经帮助全球的增长团队在几天内完成从创意到上线的闭环，并持续优化体验。
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <div key={testimonial.name} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                  <Quote className="h-8 w-8 text-indigo-300" />
                  <p className="text-sm leading-6 text-white/80">{testimonial.quote}</p>
                  <div className="mt-auto">
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-white/60">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2025 VibeAny.io, Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#features" className="hover:text-white">
              功能
            </Link>
            <Link href="/pricing" className="hover:text-white">
              定价
            </Link>
            <Link href="#faqs" className="hover:text-white">
              FAQs
            </Link>
            <Link href="/blog" className="hover:text-white">
              Blog
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
