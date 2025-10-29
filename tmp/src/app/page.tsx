"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, Check, ChevronDown, Globe, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [promptValue, setPromptValue] = useState("");

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">VibeAny</span>
              </div>
              <span className="text-xl font-semibold">VibeAny</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <div className="flex items-center gap-1 text-sm cursor-pointer hover:text-orange-600">
                <span>Product</span>
                <ChevronDown className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 text-sm cursor-pointer hover:text-orange-600">
                <span>Resources</span>
                <ChevronDown className="w-4 h-4" />
              </div>
              <a href="#pricing" className="text-sm hover:text-orange-600">Pricing</a>
              <a href="#" className="text-sm hover:text-orange-600">Enterprise</a>
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Globe className="w-5 h-5" />
              </button>
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full px-6">
                Start Building
              </Button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="gradient-bg pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light leading-tight mb-6">
            Shape your ideas<br />
            into apps that work<br />
            your way
          </h1>

          <p className="text-lg text-gray-700 mb-12 max-w-2xl mx-auto">
            VibeAny lets you build fully-functional apps in minutes with just your words. No coding necessary.
          </p>

          {/* Input Box */}
          <div className="max-w-xl mx-auto mb-12">
            <div className="gradient-card rounded-3xl p-6 shadow-xl">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Design a personal budget tracker wi"
                  value={promptValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPromptValue(e.target.value)}
                  className="w-full border-none bg-transparent text-base py-6 px-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <button className="absolute right-4 bottom-4 w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                  <ArrowRight className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Suggestion chips */}
          <div className="mb-8">
            <p className="text-sm text-gray-600 mb-4">Not sure where to start? Try one of these:</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button className="px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full text-sm hover:bg-white transition-colors border border-gray-200">
                <span className="mr-2">📊</span>
                Reporting Dashboard
              </button>
              <button className="px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full text-sm hover:bg-white transition-colors border border-gray-200">
                <span className="mr-2">🎮</span>
                Gaming Platform
              </button>
              <button className="px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full text-sm hover:bg-white transition-colors border border-gray-200">
                <span className="mr-2">👋</span>
                Onboarding Portal
              </button>
              <button className="px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full text-sm hover:bg-white transition-colors border border-gray-200">
                <span className="mr-2">🏠</span>
                Room Visualizer
              </button>
              <button className="px-4 py-2 bg-white/70 backdrop-blur-sm rounded-full text-sm hover:bg-white transition-colors border border-gray-200">
                <span className="mr-2">🔗</span>
                Networking App
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500">Trusted by 400K+ users</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="grid md:grid-cols-2 gap-8 mb-12 items-center">
            <div className="order-2 md:order-1">
              <h2 className="text-4xl font-light mb-4">
                Create at the speed of thought
              </h2>
              <p className="text-gray-600 mb-6">
                Tell VibeAny your idea, and watch it transform into a working app complete with all the necessary components, pages, flows and features.
              </p>
              <Button className="bg-black hover:bg-gray-800 text-white rounded-full px-8">
                Start building
              </Button>
            </div>
            <div className="order-1 md:order-2 feature-card-1 rounded-3xl p-8 min-h-[300px] flex items-center justify-center">
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
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-8 mb-12 items-center">
            <div className="feature-card-2 rounded-3xl p-8 min-h-[300px] flex items-center justify-center">
              <div className="bg-white/80 rounded-2xl p-6 shadow-lg max-w-sm">
                <div className="text-sm text-gray-700 font-medium mb-4">
                  Building your Subscription Tracker app
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Setting up user authentication</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Building subscription database</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Configuring email notifications</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Deploying with notifications</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-light mb-4">
                The backends built-in automatically
              </h2>
              <p className="text-gray-600 mb-6">
                Everything your idea needs to function, like letting users sign in, saving their data, or creating role-based permissions is taken care of behind the scenes.
              </p>
              <Button className="bg-black hover:bg-gray-800 text-white rounded-full px-8">
                Start building
              </Button>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl font-light mb-4">
                Ready to use, instantly.
              </h2>
              <p className="text-gray-600 mb-6">
                Our platform comes with built-in hosting, so when your app is ready the only thing left to do is publish, put it to use, and share it with your friends or community.
              </p>
              <Button className="bg-black hover:bg-gray-800 text-white rounded-full px-8">
                Start building
              </Button>
            </div>
            <div className="feature-card-3 rounded-3xl p-8 min-h-[300px] flex items-center justify-center">
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
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonial-bg py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-light text-center mb-4">
            Okay, @base_44 has blown my mind.
          </h2>
          <p className="text-center text-gray-600 mb-12">
            And other great things our users say about us.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                text: "Okay, VibeAny has blown my mind. No iterations, no changes,...",
                author: "Maria Martin",
                handle: "@marias_martin",
                icon: "X"
              },
              {
                text: "Just built this awesome web app using @base_44! I'm blown awa...",
                author: "Gleb Konon",
                handle: "",
                icon: "in"
              },
              {
                text: "VibeAny revolutionizes app development by enabling users t...",
                author: "Eran Cohen",
                handle: "",
                icon: "P"
              },
              {
                text: "Amazing understanding of the user needs and thorough handli...",
                author: "Ariel MI",
                handle: "",
                icon: "P"
              },
              {
                text: "@MS_BASE44 @base_44 I gave it a try and I must to be truthful, it...",
                author: "Thatweb3guy",
                handle: "@myfootyfantasy",
                icon: "X"
              },
              {
                text: "What makes VibeAny different is that the interaction with the AI is...",
                author: "Richard Manisa",
                handle: "",
                icon: "P"
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-sm text-gray-700 mb-4">{testimonial.text}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{testimonial.author}</div>
                    {testimonial.handle && (
                      <div className="text-xs text-gray-500">{testimonial.handle}</div>
                    )}
                  </div>
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs">
                    {testimonial.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button className="bg-black hover:bg-gray-800 text-white rounded-full px-8">
              Start building
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-bg py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-light text-white text-center mb-16">
            Pricing plans for every need
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl p-8 border-4 border-gray-300">
              <h3 className="text-3xl font-light mb-2">Start for free.</h3>
              <p className="text-gray-700 mb-6">Get access to:</p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-800">All core features</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-800">Built-in integrations</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-800">Authentication system</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-800">Database functionality</span>
                </div>
              </div>

              <Button className="w-full bg-black hover:bg-gray-800 text-white rounded-full py-6">
                Start building
              </Button>
            </div>

            {/* Paid Plan */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl p-8 border-4 border-gray-300">
              <h3 className="text-3xl font-light mb-2">Paid plans from</h3>
              <div className="text-5xl font-light mb-6">
                $20<span className="text-xl text-gray-600">/mo</span>
              </div>

              <p className="text-gray-700 mb-16">
                Upgrade as you go for more credits, more features, and more support.
              </p>

              <Button className="w-full bg-black hover:bg-gray-800 text-white rounded-full py-6">
                See all plans
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border-b">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-normal">What is VibeAny?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-6">
                VibeAny is an AI-powered platform that lets you turn any idea into a fully-functional custom app, without the need for any coding experience.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-b">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-normal">Do I need coding experience to use VibeAny?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-6">
                No. Our platform is designed to be easily accessible to non-technical users. Just describe your app idea in plain language.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-b">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-normal">What types of applications can I build with VibeAny?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-6">
                You can build a wide variety of applications including dashboards, tracking tools, portals, and more.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-b">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-normal">What kind of integrations does VibeAny support?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-6">
                VibeAny supports various integrations to extend your apps functionality.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-b">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-normal">How are VibeAny applications deployed?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-6">
                Applications are automatically hosted on our platform and can be published instantly.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border-b">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-normal">How does the natural language development process work?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-6">
                Simply describe what you want to build, and our AI will generate the complete application for you.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="border-b">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-normal">Is my data secure with VibeAny?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-6">
                Yes, we take data security seriously and implement industry-standard security measures.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="border-b">
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="text-lg font-normal">Do I own the applications I create with VibeAny?</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-6">
                Yes, you retain full ownership of the applications you create.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-16 px-4 sm:px-6 lg:px-8 border-t">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            {/* Company */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">VibeAny</span>
                </div>
                <span className="text-xl font-semibold">VibeAny</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Base 44 is the AI-powered platform that lets users build fully functioning apps in minutes. Using nothing but natural language, Base 44 enables anyone to turn their words into personal productivity apps, back-office tools, customer portals, or complete enterprise products that are ready to use, no integrations required.
              </p>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">About Us</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Affiliate Program</a></li>
              </ul>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Product</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Features</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Integrations</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Enterprise</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Pricing</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Roadmap</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Changelog</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Feature Request</a></li>
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Resources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Docs & FAQs</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Higher Ed</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Community</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Blog</a></li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Terms of Service</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Security</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Report Misuse</a></li>
                <li><a href="#" className="text-sm text-gray-600 hover:text-orange-600">Responsible Use Policy</a></li>
              </ul>
            </div>
          </div>

          {/* Social Icons & Copyright */}
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t">
            <div className="flex gap-4 mb-4 md:mb-0">
              <a href="#" className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                <span className="text-sm">X</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                <span className="text-sm">D</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                <span className="text-sm">in</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                <span className="text-sm">G</span>
              </a>
            </div>
            <p className="text-sm text-gray-500">
              2025 VibeAny Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
